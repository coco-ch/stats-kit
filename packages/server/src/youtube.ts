/*
 * YouTube connector (Data API v3 and YouTube Analytics v2), read-only, with the OAuth refresh token of the channel owner.
 * Quota: a few units per hour (results kept for one hour).
 */
import { lastDays } from 'stats-kit/contract';
import type { Item, YoutubeChannel, YoutubeDay, YoutubeOverview, YoutubeSite, YoutubeTraffic, YoutubeVideo } from 'stats-kit/contract';
import { Cache, TokenHolder, errorMessage, json, qs, type Fetch } from './http.ts';
import { DAY, ymd } from './time.ts';

export interface YoutubeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Expected channel: another channel (wrong token) is refused. */
  channelId?: string;
  /** Public address of the channel (shown even without settings). */
  channelUrl?: string;
  /** `utm_source` value of the links published on the channel ("youtube"). */
  utmSource?: string;
  /** Label of a video given by the site (film name…). */
  videoLabel?: (video: { id: string; title: string }) => string | null | undefined;
  /** Videos to follow in addition to the uploads playlist (older unlisted versions…). */
  extraVideoIds?: () => string[] | Promise<string[]>;
  tokenUrl?: string;
  apiUrl?: string;
  analyticsUrl?: string;
}

export const youtubeConfigured = (c: YoutubeConfig | null | undefined): c is YoutubeConfig => !!(c?.clientId && c.clientSecret && c.refreshToken);

/** YouTube ISO 8601 duration ("PT1M20S") in seconds. */
export function isoSeconds(iso: string | undefined): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso ?? '');
  if (!m) return 0;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

interface Table { columnHeaders?: { name: string }[]; rows?: unknown[][] }
/** YouTube Analytics response as named rows. */
export const tableRows = (t: Table): Record<string, string | number>[] =>
  (t.rows ?? []).map((r) => Object.fromEntries((t.columnHeaders ?? []).map((h, i) => [h.name, r[i] as string | number])));

const num = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const SERIES_DAYS = 180;

/** Channel data, independent of the chosen period (kept for one hour). */
interface ChannelData {
  channel: YoutubeChannel;
  videos: YoutubeVideo[];
  series: YoutubeDay[];
  traffic: YoutubeTraffic[];
  analyticsError: string | null;
}

/** What the site counts on its side (visits from YouTube, requests): provided by the kit. */
export interface SiteCounter {
  visits?: (from: number, to: number, source: string) => Promise<{ visits: number; visitors: number; referred: number | null; landing: Item[] }>;
  requests?: (from: number, to: number, source: string) => Promise<{ total: number; bySubject: Item[] }>;
}

export interface YoutubeClient {
  overview(days: number, site?: SiteCounter, now?: number): Promise<YoutubeOverview>;
  /** Most viewed video over a period (report). */
  topVideo(start: string, end: string): Promise<{ title: string; url: string; views: number } | null>;
  reset(): void;
}

/** Response of the same shape without a channel (not configured or error). */
export function emptyYoutube(status: 'not-configured' | 'error', error: string | null, days: number, channelUrl: string | null, now = Date.now()): YoutubeOverview {
  const zero = { views: 0, minutes: 0, gained: 0, lost: 0, averageViewDuration: 0 };
  return { version: 1, status, error, generatedAt: new Date(now).toISOString(), channelUrl, channel: null, videos: [], days, start: '', end: '', totals: zero, previous: { ...zero }, series: [], traffic: [], analyticsError: null, site: null };
}

/** Visits and requests from YouTube over the period and the previous one; `null` if the site counts nothing. */
export async function siteSide(site: SiteCounter | undefined, source: string, days: number, now: number): Promise<YoutubeSite | null> {
  if (!site?.visits && !site?.requests) return null;
  const start = now - days * DAY, prevStart = start - days * DAY;
  const [v, pv, r, pr] = await Promise.all([
    site.visits?.(start, now, source).catch(() => null) ?? null,
    site.visits?.(prevStart, start, source).catch(() => null) ?? null,
    site.requests?.(start, now, source).catch(() => null) ?? null,
    site.requests?.(prevStart, start, source).catch(() => null) ?? null,
  ]);
  return {
    visits: v?.visits ?? null, visitors: v?.visitors ?? null, previousVisits: pv?.visits ?? null, referred: v?.referred ?? null, landing: v?.landing ?? [],
    requests: r?.total ?? null, previousRequests: pr?.total ?? null, requestsBySubject: r?.bySubject ?? [],
  };
}

export function youtubeClient(config: YoutubeConfig, fetchFn: Fetch = fetch): YoutubeClient {
  const api = (config.apiUrl ?? 'https://www.googleapis.com/youtube/v3').replace(/\/+$/, '');
  const analytics = (config.analyticsUrl ?? 'https://youtubeanalytics.googleapis.com/v2').replace(/\/+$/, '');
  const cache = new Cache();
  const source = config.utmSource ?? 'youtube';

  const tokens = new TokenHolder(async () => {
    const r = await fetchFn(config.tokenUrl ?? 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      const code = ((await r.json().catch(() => ({}))) as { error?: string }).error ?? '';
      throw new Error(`youtube token ${r.status}${code === 'invalid_grant' ? ' (authorisation revoked or expired: the channel owner must authorise access again)' : code ? ` ${code}` : ''}`);
    }
    const j = (await r.json()) as { access_token: string; expires_in: number };
    return { value: j.access_token, expiresInMs: j.expires_in * 1000 };
  });

  const get = async <T>(url: string): Promise<T> => {
    const r = await fetchFn(url, { headers: { Authorization: `Bearer ${await tokens.get()}` }, signal: AbortSignal.timeout(20_000) });
    return json<T>(r, 'youtube', (s) => (s === 403 ? ' (access denied: API not enabled in the Google Cloud project, or missing scope)' : ''));
  };
  const report = (p: Record<string, string | number>) => get<Table>(`${analytics}/reports?${qs({ ids: 'channel==MINE', ...p })}`).then(tableRows);

  interface ApiChannel { id: string; snippet?: { title?: string; customUrl?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> }; statistics?: { viewCount?: string; subscriberCount?: string; hiddenSubscriberCount?: boolean; videoCount?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }
  interface ApiVideo { id: string; snippet?: { title?: string; publishedAt?: string }; contentDetails?: { duration?: string }; status?: { privacyStatus?: string }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }

  const channelData = (now: number): Promise<ChannelData> =>
    cache.get(`channel:${ymd(now)}`, 3_600_000, async () => {
      const ch = (await get<{ items?: ApiChannel[] }>(`${api}/channels?${qs({ part: 'snippet,statistics,contentDetails', mine: 'true' })}`)).items?.[0];
      if (!ch) throw new Error('no channel for this Google account');
      if (config.channelId && ch.id !== config.channelId) throw new Error(`the token gives access to channel ${ch.id}, not to the expected channel`);
      const s = ch.snippet ?? {}, st = ch.statistics ?? {};
      const handle = s.customUrl ?? null;
      const channel: YoutubeChannel = {
        id: ch.id, title: s.title ?? ch.id, handle,
        url: config.channelUrl ?? (handle ? `https://www.youtube.com/${handle.startsWith('@') ? handle : `@${handle}`}` : `https://www.youtube.com/channel/${ch.id}`),
        studioUrl: `https://studio.youtube.com/channel/${ch.id}`,
        thumbnail: s.thumbnails?.['medium']?.url ?? s.thumbnails?.['default']?.url ?? null,
        subscribers: st.hiddenSubscriberCount ? null : Number(st.subscriberCount ?? 0), views: Number(st.viewCount ?? 0), videos: Number(st.videoCount ?? 0),
        createdAt: s.publishedAt ?? null,
      };

      const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
      const listed = uploads
        ? ((await get<{ items?: { contentDetails?: { videoId?: string } }[] }>(`${api}/playlistItems?${qs({ part: 'contentDetails', maxResults: 50, playlistId: uploads })}`)).items ?? [])
            .map((i) => i.contentDetails?.videoId).filter((x): x is string => !!x)
        : [];
      const extra = (await config.extraVideoIds?.()) ?? [];
      const ids = [...new Set([...listed, ...extra])].slice(0, 50);
      const apiVideos = ids.length ? ((await get<{ items?: ApiVideo[] }>(`${api}/videos?${qs({ part: 'snippet,statistics,contentDetails,status', id: ids.join(','), maxResults: 50 })}`)).items ?? []) : [];

      // a refusal from YouTube Analytics does not prevent showing the channel and its videos
      const end = ymd(now - DAY), first = ymd(now - SERIES_DAYS * DAY);
      const since = channel.createdAt && channel.createdAt.slice(0, 10) < end ? channel.createdAt.slice(0, 10) : first;
      let analyticsError: string | null = null;
      const opt = <T>(p: Promise<T>, fallback: T) => p.catch((e: unknown) => ((analyticsError ??= errorMessage(e)), fallback));
      const [daily, perVideo, sources] = await Promise.all([
        opt(report({ startDate: first, endDate: end, metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost', dimensions: 'day', sort: 'day' }), []),
        apiVideos.length ? opt(report({ startDate: since, endDate: end, metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage', dimensions: 'video', sort: '-views', maxResults: 200 }), []) : Promise.resolve([]),
        opt(report({ startDate: ymd(now - 28 * DAY), endDate: end, metrics: 'views,estimatedMinutesWatched', dimensions: 'insightTrafficSourceType', sort: '-views' }), []),
      ]);

      const byDay = new Map(daily.map((r) => [String(r['day']), r]));
      const series: YoutubeDay[] = Array.from({ length: SERIES_DAYS }, (_, i) => {
        const date = ymd(now - (SERIES_DAYS - i) * DAY), r = byDay.get(date);
        return { date, views: Number(r?.['views'] ?? 0), minutes: Number(r?.['estimatedMinutesWatched'] ?? 0), gained: Number(r?.['subscribersGained'] ?? 0), lost: Number(r?.['subscribersLost'] ?? 0) };
      });
      const stats = new Map(perVideo.map((r) => [String(r['video']), r]));
      const videos: YoutubeVideo[] = apiVideos.map((v) => {
        const a = stats.get(v.id);
        const title = v.snippet?.title ?? v.id;
        return {
          id: v.id, url: `https://www.youtube.com/watch?v=${v.id}`, title, label: config.videoLabel?.({ id: v.id, title }) ?? null,
          publishedAt: v.snippet?.publishedAt ?? null, duration: isoSeconds(v.contentDetails?.duration), visibility: v.status?.privacyStatus ?? 'public',
          views: Number(v.statistics?.viewCount ?? 0), likes: num(v.statistics?.likeCount), comments: num(v.statistics?.commentCount),
          minutes: num(a?.['estimatedMinutesWatched']), averageViewDuration: num(a?.['averageViewDuration']), averageViewPercentage: num(a?.['averageViewPercentage']),
        };
      }).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
      const traffic = sources.map((r) => ({ source: String(r['insightTrafficSourceType']), views: Number(r['views'] ?? 0), minutes: Number(r['estimatedMinutesWatched'] ?? 0) }));
      return { channel, videos, series, traffic, analyticsError };
    });

  async function overview(days: number, site?: SiteCounter, now = Date.now()): Promise<YoutubeOverview> {
    const n = Math.min(90, Math.max(1, Math.floor(days) || 28));
    const sideP = siteSide(site, source, n, now);
    try {
      const d = await channelData(now);
      const p = lastDays(d.series, n);
      return {
        version: 1, status: 'ok', error: null, generatedAt: new Date(now).toISOString(), channelUrl: d.channel.url, channel: d.channel, videos: d.videos,
        days: n, start: p.start, end: p.end, totals: p.totals, previous: p.previous, series: d.series, traffic: d.traffic, analyticsError: d.analyticsError, site: await sideP,
      };
    } catch (e) {
      return { ...emptyYoutube('error', errorMessage(e), n, config.channelUrl ?? null, now), site: await sideP };
    }
  }

  async function topVideo(start: string, end: string) {
    const d = await channelData(Date.now());
    const top = await cache.get(`top:${start}:${end}`, 3_600_000, () => report({ startDate: start, endDate: end, metrics: 'views', dimensions: 'video', sort: '-views', maxResults: 1 }));
    const v = d.videos.find((x) => x.id === top[0]?.['video']);
    return v ? { title: v.label ?? v.title, url: v.url, views: Number(top[0]['views']) } : null;
  }

  return { overview, topVideo, reset: () => { cache.clear(); tokens.reset(); } };
}
