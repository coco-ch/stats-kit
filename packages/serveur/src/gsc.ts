/*
 * Connecteur Google Search Console, en lecture seule et sans dépendance. Deux façons de s'authentifier :
 *  - compte de service : le jeton s'obtient en signant un JWT (RS256) avec la clé du compte ;
 *  - compte Google autorisé une fois (OAuth) : jeton de rafraîchissement (utile quand l'organisation interdit les clés).
 */
import { createSign } from 'node:crypto';
import type { IndexationResponse, Inspection, QueryPage, SearchDay, SearchOverview, SearchRow, SearchTotals, Sitemap, SourceStatus } from 'stats-kit/contrat';
import { Cache, TokenHolder, errorMessage, json, settle, type Fetch } from './http.ts';
import { DAY, ymd } from './temps.ts';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export interface ServiceKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}
export interface OauthCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export interface GscConfig {
  /** Propriété Search Console : « sc-domain:exemple.org » ou « https://www.exemple.org/ ». */
  property: string;
  /** Clé JSON du compte de service : objet, texte JSON, ou ce texte encodé en base64. */
  serviceAccount?: ServiceKey | string;
  /** Identifiants OAuth : objet, texte JSON, ou base64. */
  oauth?: OauthCredentials | string;
  /** Mots du nom du site (recherches « marque »). */
  brandTerms?: string[];
  /** Plan du site lu pour la vérification d'indexation (« https://www.exemple.org/sitemap.xml »). */
  sitemapUrl?: string;
  /** Adresses du plan du site à contrôler (toutes par défaut, 200 au plus). */
  indexationFilter?: (url: string) => boolean;
  /** Langue des messages d'inspection (« fr-FR »). */
  languageCode?: string;
  /** Adresses des API (tests de bout en bout : faux Google local). */
  apiUrl?: string;
  inspectUrl?: string;
  tokenUrl?: string;
}

/** Lit un JSON donné tel quel, en base64, ou déjà en objet ; `null` s'il n'a pas les champs demandés. */
export function parseCredentials<T>(raw: T | string | undefined | null, fields: (keyof T)[]): T | null {
  if (!raw) return null;
  const candidates = typeof raw === 'string' ? [raw.trim(), Buffer.from(raw.trim(), 'base64').toString('utf8')] : [raw];
  for (const c of candidates) {
    try {
      const o = (typeof c === 'string' ? JSON.parse(c) : c) as Record<string, unknown>;
      if (fields.every((f) => typeof o[f as string] === 'string' && o[f as string])) return o as T;
    } catch {
      /* essai suivant */
    }
  }
  return null;
}

export const gscKey = (c: GscConfig | null | undefined) => parseCredentials<ServiceKey>(c?.serviceAccount, ['client_email', 'private_key']);
export const gscOauth = (c: GscConfig | null | undefined) => parseCredentials<OauthCredentials>(c?.oauth, ['client_id', 'client_secret', 'refresh_token']);
export const gscConfigured = (c: GscConfig | null | undefined): c is GscConfig => !!(c?.property && (gscKey(c) || gscOauth(c)));

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

/** JWT d'assertion signé en RS256, valable une heure. */
export function signJwt(k: ServiceKey, scope = SCOPE, now = Date.now()): string {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iat = Math.floor(now / 1000);
  const claim = b64url(JSON.stringify({ iss: k.client_email, scope, aud: k.token_uri || 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(k.private_key);
  return `${head}.${claim}.${b64url(sig)}`;
}

interface ApiRow { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }
const totals = (r?: ApiRow): SearchTotals => ({ clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0, ctr: r?.ctr ?? 0, position: r?.position ?? 0 });
const rows = (r: { rows?: ApiRow[] }): SearchRow[] => (r.rows ?? []).map((x) => ({ key: x.keys?.[0] ?? '', ...totals(x) }));
const days = (r: { rows?: ApiRow[] }): SearchDay[] => (r.rows ?? []).map((x) => ({ date: x.keys?.[0] ?? '', ...totals(x) }));

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Période et période précédente de même durée. Google publie avec deux à trois jours de retard : la période se termine au plus tard
 * deux jours avant aujourd'hui. Bornes personnalisées (AAAA-MM-JJ) limitées à 16 mois.
 */
export function searchPeriod(q: { days?: unknown; from?: unknown; to?: unknown }, now = Date.now()) {
  const last = Math.floor((now - 2 * DAY) / DAY) * DAY;
  if (typeof q.from === 'string' && typeof q.to === 'string' && YMD.test(q.from) && YMD.test(q.to)) {
    const start = Date.parse(`${q.from}T00:00:00Z`);
    const end = Math.min(Date.parse(`${q.to}T00:00:00Z`), last);
    if (end >= start && end - start <= 480 * DAY) {
      const n = Math.round((end - start) / DAY) + 1;
      return { days: n, start: ymd(start), end: ymd(end), previousStart: ymd(start - n * DAY), previousEnd: ymd(start - DAY) };
    }
  }
  const asked = Math.floor(Number(q.days));
  const n = Number.isFinite(asked) && asked >= 1 ? Math.min(asked, 480) : 28;
  return { days: n, start: ymd(last - (n - 1) * DAY), end: ymd(last), previousStart: ymd(last - (2 * n - 1) * DAY), previousEnd: ymd(last - n * DAY) };
}

export interface GscClient {
  overview(q: { days?: unknown; from?: unknown; to?: unknown }, now?: number): Promise<SearchOverview>;
  indexation(now?: number): Promise<IndexationResponse>;
  reset(): void;
}

/** Réponse vide de même forme (non configuré ou erreur). */
export function emptySearch(status: SourceStatus, error: string | null, period: ReturnType<typeof searchPeriod>, config?: GscConfig | null, now = Date.now()): SearchOverview {
  const zero = totals();
  return {
    version: 1, status, error, generatedAt: new Date(now).toISOString(), property: config?.property ?? null, serviceAccount: gscKey(config)?.client_email ?? null,
    ...period, totals: zero, previous: zero, series: [], previousSeries: [], queries: [], previousQueries: [], pages: [], previousPages: [],
    countries: [], previousCountries: [], devices: [], previousDevices: [], appearance: [], queryPages: [], sitemaps: null, brandTerms: config?.brandTerms ?? [],
  };
}

export function gscClient(config: GscConfig, fetchFn: Fetch = fetch): GscClient {
  const api = (config.apiUrl ?? 'https://www.googleapis.com/webmasters/v3').replace(/\/+$/, '');
  const inspect = config.inspectUrl ?? 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
  const cache = new Cache();
  const key = gscKey(config);
  const oauth = gscOauth(config);

  const tokens = new TokenHolder(async () => {
    const r = await fetchFn(config.tokenUrl ?? key?.token_uri ?? 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(key
        ? { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(key) }
        : { grant_type: 'refresh_token', client_id: oauth!.client_id, client_secret: oauth!.client_secret, refresh_token: oauth!.refresh_token }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = await json<{ access_token: string; expires_in: number }>(r, 'gsc token');
    return { value: j.access_token, expiresInMs: j.expires_in * 1000 };
  });

  async function call<T>(url: string, body?: unknown): Promise<T> {
    const r = await fetchFn(url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${await tokens.get()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    return json<T>(r, 'gsc', (s) => (s === 403 ? ' (accès refusé : droit manquant sur la propriété, ou API Search Console non activée)' : ''));
  }
  const site = `${api}/sites/${encodeURIComponent(config.property)}`;
  const query = (body: Record<string, unknown>) => call<{ rows?: ApiRow[] }>(`${site}/searchAnalytics/query`, body);

  async function sitemaps(): Promise<Sitemap[]> {
    interface ApiSitemap { path: string; lastDownloaded?: string; errors?: string; warnings?: string; isPending?: boolean; contents?: { type: string; submitted?: string; indexed?: string }[] }
    const r = await call<{ sitemap?: ApiSitemap[] }>(`${site}/sitemaps`);
    return (r.sitemap ?? []).map((s) => {
      const web = (s.contents ?? []).filter((c) => c.type === 'web');
      const indexed = web.some((c) => c.indexed !== undefined) ? web.reduce((n, c) => n + Number(c.indexed ?? 0), 0) : null;
      return { path: s.path, lastDownloaded: s.lastDownloaded ?? null, errors: Number(s.errors ?? 0), warnings: Number(s.warnings ?? 0), pending: !!s.isPending, submitted: web.reduce((n, c) => n + Number(c.submitted ?? 0), 0), indexed };
    });
  }

  async function overview(q: { days?: unknown; from?: unknown; to?: unknown }, now = Date.now()): Promise<SearchOverview> {
    const p = searchPeriod(q, now);
    try {
      return await cache.get(`perf:${p.start}:${p.end}`, 3 * 3_600_000, async () => {
        const run = (extra: Record<string, unknown>, from = p.start, to = p.end) => query({ startDate: from, endDate: to, dataState: 'final', ...extra });
        const none: { rows?: ApiRow[] } = {};
        const [cur, prev, series, queries, pages, previousQueries, previousPages, countries, devices] = await Promise.all([
          run({}), run({}, p.previousStart, p.previousEnd), run({ dimensions: ['date'], rowLimit: 500 }),
          run({ dimensions: ['query'], rowLimit: 250 }), run({ dimensions: ['page'], rowLimit: 250 }),
          run({ dimensions: ['query'], rowLimit: 250 }, p.previousStart, p.previousEnd), run({ dimensions: ['page'], rowLimit: 250 }, p.previousStart, p.previousEnd),
          run({ dimensions: ['country'], rowLimit: 25 }), run({ dimensions: ['device'], rowLimit: 5 }),
        ]);
        // compléments : un refus de Google sur l'un d'eux n'empêche pas d'afficher le reste
        const [previousSeries, previousCountries, previousDevices, queryPages, appearance, maps] = await Promise.all([
          settle(run({ dimensions: ['date'], rowLimit: 500 }, p.previousStart, p.previousEnd), none),
          settle(run({ dimensions: ['country'], rowLimit: 25 }, p.previousStart, p.previousEnd), none),
          settle(run({ dimensions: ['device'], rowLimit: 5 }, p.previousStart, p.previousEnd), none),
          settle(run({ dimensions: ['query', 'page'], rowLimit: 250 }), none),
          settle(run({ dimensions: ['searchAppearance'], rowLimit: 15 }), none),
          settle(sitemaps(), null),
        ]);
        const base = emptySearch('ok', null, p, config, now);
        return {
          ...base,
          totals: totals(cur.rows?.[0]), previous: totals(prev.rows?.[0]), series: days(series), previousSeries: days(previousSeries),
          queries: rows(queries), previousQueries: rows(previousQueries), pages: rows(pages), previousPages: rows(previousPages),
          countries: rows(countries), previousCountries: rows(previousCountries), devices: rows(devices), previousDevices: rows(previousDevices),
          appearance: rows(appearance),
          queryPages: (queryPages.rows ?? []).map((r): QueryPage => ({ query: r.keys?.[0] ?? '', page: r.keys?.[1] ?? '', ...totals(r) })),
          sitemaps: maps,
        };
      });
    } catch (e) {
      return emptySearch('error', errorMessage(e), p, config, now);
    }
  }

  async function inspectOne(url: string): Promise<Inspection> {
    try {
      const r = await call<{ inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string } } }>(inspect, {
        inspectionUrl: url, siteUrl: config.property, languageCode: config.languageCode ?? 'fr-FR',
      });
      const s = r.inspectionResult?.indexStatusResult;
      return { url, verdict: s?.verdict ?? 'UNKNOWN', state: s?.coverageState ?? '—', lastCrawl: s?.lastCrawlTime ?? null, indexed: s?.verdict === 'PASS' };
    } catch (e) {
      return { url, verdict: 'ERROR', state: errorMessage(e).slice(0, 80), lastCrawl: null, indexed: false };
    }
  }

  async function indexation(now = Date.now()): Promise<IndexationResponse> {
    const base: IndexationResponse = { version: 1, status: 'ok', error: null, checkedAt: new Date(now).toISOString(), total: 0, indexed: 0, pages: [] };
    if (!config.sitemapUrl) return { ...base, status: 'not-configured' };
    try {
      return await cache.get('indexation', 6 * 3_600_000, async () => {
        const r = await fetchFn(config.sitemapUrl!, { signal: AbortSignal.timeout(15_000) });
        if (!r.ok) throw new Error(`sitemap ${r.status}`);
        const xml = await r.text();
        const urls = [...new Set([...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]))].filter(config.indexationFilter ?? (() => true)).slice(0, 200);
        const pages: Inspection[] = [];
        for (let i = 0; i < urls.length; i += 6) pages.push(...(await Promise.all(urls.slice(i, i + 6).map(inspectOne))));
        return { ...base, total: pages.length, indexed: pages.filter((x) => x.indexed).length, pages };
      });
    } catch (e) {
      return { ...base, status: 'error', error: errorMessage(e) };
    }
  }

  return { overview, indexation, reset: () => { cache.clear(); tokens.reset(); } };
}
