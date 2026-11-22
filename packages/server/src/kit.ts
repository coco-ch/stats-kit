/*
 * Server entry point: `createStatsKit(settings)` connects the connectors, the cache, the report and the HTTP routes.
 * No framework imposed: `handle()` answers a simply described request; `middleware()` plugs into Express or `node:http`.
 */
import { readFileSync } from 'node:fs';
import { createTexts, type IndexationResponse, type Item, type LiveResponse, type ReportPreview, type ReportSendResult, type SearchOverview, type StatsOverview, type TextOverrides, type Texts, type World, type YoutubeOverview } from 'stats-kit/contract';
import { buildOverview, siteExtras, sourceVisits, type OverviewOptions } from './overview.ts';
import { gscClient, gscConfigured, emptySearch, searchPeriod, type GscClient, type GscConfig } from './gsc.ts';
import { Cache, errorMessage, type Fetch } from './http.ts';
import { dailyVisits, goalSeries } from './report/daily.ts';
import { buildReport, previewHtml, type ReportBlock, type ReportMessage } from './report/report.ts';
import { loadWorld, worldFile } from './report/map-png.ts';
import type { ReportTheme } from './report/theme.ts';
import { resolveRange, type RangeQuery } from './time.ts';
import { umamiClient, umamiConfigured, type UmamiClient, type UmamiConfig } from './umami.ts';
import { emptyYoutube, youtubeClient, youtubeConfigured, type SiteCounter, type YoutubeClient, type YoutubeConfig } from './youtube.ts';

export interface ReportConfig {
  /** Colours and logo (default: neutral blue). */
  theme?: ReportTheme;
  /** Statistics page of the administration, opened by the report button. */
  statsUrl?: string | null;
  /** Days covered by default (7). */
  days?: number;
  /**
   * Sending of the message, done by the site (SMTP, API…): the library sends nothing itself. Returns the number of recipients
   * (or nothing). Without this function, the send route answers 503.
   */
  send?: (message: ReportMessage) => Promise<number | void>;
  /** Adds the Google block (true by default, if Search Console is connected). */
  search?: boolean;
  /** Adds the YouTube block (true by default, if the channel is connected). */
  youtube?: boolean;
  /** Adds the "At a glance" card: top source, country, page and entry page, best day, busiest slot (true by default). */
  glance?: boolean;
  /**
   * Site-specific cards (costs, requests, news…), shown after the rankings; given in the site's language. A failure of this
   * function is logged and the report is sent without these cards.
   */
  blocks?: (overview: StatsOverview) => ReportBlock[] | Promise<ReportBlock[]>;
  /** Google page of the administration: link at the end of the Google block of the report. */
  searchUrl?: string | null;
  /** YouTube page of the administration: link at the end of the YouTube block of the report. */
  youtubeUrl?: string | null;
  /**
   * Text overrides read again at every report (texts edited in the site's administration: subject, title, introduction, footer…),
   * applied over `texts`. The pages and the other routes keep the texts given at creation.
   */
  texts?: () => TextOverrides | null | undefined | Promise<TextOverrides | null | undefined>;
}

export interface StatsKitConfig extends Omit<OverviewOptions, 'timeZone' | 'dashboardUrl'> {
  /** Site name (header and subject of the report). */
  siteName: string;
  /** Language of the texts: "en" (default), "fr", "de", "es", "it", "pt", "nl", a tag with a region ("fr-CH"), or another language with `baseTexts`. */
  locale?: string;
  /** Text overrides (site settings). */
  texts?: TextOverrides;
  /** Complete texts of another language. */
  baseTexts?: Texts;
  /** Time zone of the slots and of the report ("Europe/Paris"); UTC by default. */
  timeZone?: string;
  umami?: UmamiConfig | null;
  gsc?: GscConfig | null;
  youtube?: YoutubeConfig | null;
  /** Requests recorded by the site after a visit from a source (`utm_source`), for the YouTube page. */
  sourceRequests?: (from: number, to: number, source: string) => Promise<{ total: number; bySubject: Item[] }>;
  report?: ReportConfig;
  /** Time to live of the overview cache (2 minutes by default). */
  cacheTtlMs?: number;
  /** `fetch` to use (tests, proxy). */
  fetch?: Fetch;
  /** Clock (tests). */
  now?: () => number;
  /** Base map (default: the one shipped with the library); `null` for a report without a map. */
  world?: World | URL | string | null;
}

/** HTTP request reduced to what the routes need. */
export interface KitRequest {
  method: string;
  /** Path relative to the mount point ("/overview"). */
  path: string;
  query: Record<string, string | undefined>;
}
export interface KitResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface StatsKit {
  readonly texts: Texts;
  overview(q?: RangeQuery): Promise<StatsOverview>;
  live(): Promise<LiveResponse>;
  search(q?: RangeQuery): Promise<SearchOverview>;
  indexation(): Promise<IndexationResponse>;
  youtube(days?: number): Promise<YoutubeOverview>;
  /** Report of the last `days` days (7 by default). */
  report(q?: RangeQuery, weekly?: boolean): Promise<ReportMessage>;
  /** Builds the report and hands it to `report.send`. */
  sendReport(q?: RangeQuery, weekly?: boolean): Promise<ReportSendResult>;
  /** Base map (GeoJSON) served to the components. */
  worldJson(): string | null;
  handle(req: KitRequest): Promise<KitResponse>;
  /** Express / `node:http` middleware: `app.use('/api/admin/audience', requireAdmin, kit.middleware())`. */
  middleware(): (req: { method?: string; url?: string }, res: NodeResponse, next?: (err?: unknown) => void) => void;
}

/** What the middleware uses of the Node response. */
export interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
}

/** Overrides given at creation, completed section by section by those read at report time. */
function mergeOverrides(base: TextOverrides | undefined, extra: TextOverrides): TextOverrides {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const b = out[k];
    out[k] = v && typeof v === 'object' && b && typeof b === 'object' ? { ...b, ...v } : v;
  }
  return out as TextOverrides;
}

export function createStatsKit(config: StatsKitConfig): StatsKit {
  const now = config.now ?? Date.now;
  const tz = config.timeZone ?? 'UTC';
  const texts = createTexts(config.locale ?? 'en', config.texts, config.baseTexts);
  const fetchFn = config.fetch ?? ((input: string, init?: RequestInit) => fetch(input, init));
  const umami: UmamiClient | null = umamiConfigured(config.umami) ? umamiClient(config.umami, fetchFn) : null;
  const gsc: GscClient | null = gscConfigured(config.gsc) ? gscClient({ languageCode: texts.locale, ...config.gsc }, fetchFn) : null;
  const yt: YoutubeClient | null = youtubeConfigured(config.youtube) ? youtubeClient(config.youtube, fetchFn) : null;
  const cache = new Cache(now);
  const ttl = config.cacheTtlMs ?? 120_000;
  const dashboardUrl = umami && config.umami?.dashboardUrl !== false
    ? (config.umami?.dashboardUrl || `${config.umami!.url.replace(/\/+$/, '')}/websites/${config.umami!.websiteId}`)
    : null;

  let world: World | null | undefined;
  let worldText: string | null | undefined;
  const getWorld = (): World | null => {
    if (world !== undefined) return world;
    try {
      const w = config.world;
      world = w === null ? null : w && typeof w === 'object' && 'features' in w ? w : loadWorld(w ?? undefined);
    } catch {
      world = null; // without a base map, the report is sent without a map rather than not at all
    }
    return world;
  };

  const overview = async (q: RangeQuery = {}): Promise<StatsOverview> => {
    const range = resolveRange(q, tz, now());
    const key = typeof q.from === 'string' ? `r:${range.from}:${range.to}` : `d:${range.days}`;
    // an answer in error (Umami unreachable, refused sign-in…) is not kept: the next call asks Umami again
    const o = await cache.get(`overview:${key}`, ttl, () => buildOverview(umami, range, { ...config, extras: undefined, timeZone: tz, dashboardUrl }, now()), (x) => x.status !== 'error');
    // the site's own data (its database: requests received, to handle…) is read at every call, never kept with Umami's figures
    return { ...o, extras: await siteExtras({ ...config, timeZone: tz }, range) }; // the period as of now, not as of the cached answer
  };

  const live = async (): Promise<LiveResponse> => {
    let active: number | null = null;
    if (umami) {
      try {
        const a = await umami.get<{ visitors?: number; x?: number }>('active');
        active = a.visitors ?? a.x ?? 0;
      } catch {
        active = null;
      }
    }
    return { version: 1, active, at: new Date(now()).toISOString() };
  };

  const search = (q: RangeQuery = {}): Promise<SearchOverview> =>
    gsc ? gsc.overview(q, now()) : Promise.resolve(emptySearch('not-configured', null, searchPeriod(q, now()), config.gsc, now()));

  const indexation = async (): Promise<IndexationResponse> =>
    gsc ? gsc.indexation(now()) : { version: 1, status: 'not-configured', error: null, checkedAt: new Date(now()).toISOString(), total: 0, indexed: 0, pages: [] };

  const siteCounter: SiteCounter = {
    visits: umami ? (a, b, source) => sourceVisits(umami, a, b, source, config.pages) : undefined,
    requests: config.sourceRequests,
  };
  const youtube = (days = 28): Promise<YoutubeOverview> =>
    yt ? yt.overview(days, siteCounter, now()) : Promise.resolve(emptyYoutube('not-configured', null, days, config.youtube?.channelUrl ?? null, now()));

  async function report(q: RangeQuery = {}, weekly = false): Promise<ReportMessage> {
    const r = config.report ?? {};
    const days = q.days ?? (q.from ? undefined : (r.days ?? 7));
    const o = await overview({ ...q, days });
    const withSearch = r.search !== false && gsc ? await search({ days: o.range.days }) : null;
    const withYoutube = r.youtube !== false && yt ? await youtube(Math.min(90, o.range.days)) : null;
    let videos: { title: string; url: string; views: number }[] = [];
    if (yt && withYoutube?.status === 'ok' && withYoutube.totals.views) videos = await yt.topVideos(withYoutube.start, withYoutube.end, 3, now()).catch(() => []);
    let blocks: ReportBlock[] = [];
    if (r.blocks) {
      try {
        blocks = await r.blocks(o);
      } catch (e) {
        console.error('[stats-kit] report blocks', e);
      }
    }
    // visits and bounces day by day, occurrences of the goals: the charts of these figures
    const daily = umami ? await dailyVisits(umami, o) : null;
    const extra = r.texts ? await r.texts() : null;
    const reportTexts = extra ? createTexts(config.locale ?? 'en', mergeOverrides(config.texts, extra), config.baseTexts) : texts;
    return buildReport({
      overview: o, blocks, glance: r.glance, daily, goalSeries: goalSeries(o, config.goals ?? []), search: withSearch, youtube: withYoutube, youtubeVideos: videos, texts: reportTexts, theme: r.theme ?? { brand: '#2f5bd3' },
      siteName: config.siteName, statsUrl: r.statsUrl ?? null, searchUrl: r.searchUrl ?? null, youtubeUrl: r.youtubeUrl ?? null, weekly, world: getWorld(),
    });
  }

  async function sendReport(q: RangeQuery = {}, weekly = false): Promise<ReportSendResult> {
    const send = config.report?.send;
    if (!send) return { version: 1, ok: false, recipients: 0, error: 'send-not-configured' };
    try {
      const n = await send(await report(q, weekly));
      return { version: 1, ok: true, recipients: typeof n === 'number' ? n : 0, error: null };
    } catch (e) {
      return { version: 1, ok: false, recipients: 0, error: errorMessage(e) };
    }
  }

  const worldJson = (): string | null => {
    if (worldText !== undefined) return worldText;
    const w = config.world;
    try {
      worldText = w === null ? null : w && typeof w === 'object' && 'features' in w ? JSON.stringify(w) : readFileSync(w ?? worldFile(), 'utf8');
    } catch {
      worldText = null;
    }
    return worldText;
  };

  const jsonResponse = (status: number, body: unknown, maxAge = 0): KitResponse => ({
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge ? `private, max-age=${maxAge}` : 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(body),
  });

  async function handle(req: KitRequest): Promise<KitResponse> {
    const path = req.path.replace(/\/+$/, '') || '/';
    const q = req.query;
    const range: RangeQuery = { days: q['days'], from: q['from'], to: q['to'] };
    const method = req.method.toUpperCase();
    try {
      if (method === 'GET') {
        switch (path) {
          case '/':
          case '/overview': return jsonResponse(200, await overview(range));
          case '/live': return jsonResponse(200, await live());
          case '/search': return jsonResponse(200, await search(range));
          case '/search/indexation': return jsonResponse(200, await indexation());
          case '/youtube': return jsonResponse(200, await youtube(Number(q['days']) || 28));
          case '/report/preview': {
            const m = await report(range);
            const body: ReportPreview = { version: 1, subject: m.subject, html: previewHtml(m), text: m.text };
            return jsonResponse(200, body);
          }
          case '/world.json': {
            const w = worldJson();
            return w ? { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=604800' }, body: w } : jsonResponse(404, { error: 'not-found' });
          }
        }
      }
      if (method === 'POST' && path === '/report/send') {
        const r = await sendReport(range);
        return jsonResponse(r.ok ? 200 : r.error === 'send-not-configured' ? 503 : 502, r);
      }
      return jsonResponse(404, { error: 'not-found' });
    } catch (e) {
      console.error('[stats-kit]', e);
      return jsonResponse(500, { error: 'internal-error' });
    }
  }

  const middleware = () => (req: { method?: string; url?: string }, res: NodeResponse, next?: (err?: unknown) => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));
    handle({ method: req.method ?? 'GET', path: url.pathname, query })
      .then((r) => {
        if (r.status === 404 && next) return next(); // unknown route: hand over to the rest of the application
        res.statusCode = r.status;
        for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
        res.end(r.body);
      })
      .catch((e: unknown) => (next ? next(e) : ((res.statusCode = 500), res.end())));
  };

  return { texts, overview, live, search, indexation, youtube, report, sendReport, worldJson, handle, middleware };
}
