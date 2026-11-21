/*
 * Connecteur YouTube (Data API v3 et YouTube Analytics v2), en lecture seule, avec le jeton de rafraîchissement OAuth du
 * propriétaire de la chaîne. Quota : quelques unités par heure (résultats gardés une heure).
 */
import { lastDays } from 'stats-kit/contrat';
import { Cache, TokenHolder, errorMessage, json, qs } from "./http.js";
import { DAY, ymd } from "./temps.js";
export const youtubeConfigured = (c) => !!(c?.clientId && c.clientSecret && c.refreshToken);
/** Durée ISO 8601 de YouTube (« PT1M20S ») en secondes. */
export function isoSeconds(iso) {
    const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso ?? '');
    if (!m)
        return 0;
    return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}
/** Réponse de YouTube Analytics en lignes nommées. */
export const tableRows = (t) => (t.rows ?? []).map((r) => Object.fromEntries((t.columnHeaders ?? []).map((h, i) => [h.name, r[i]])));
const num = (v) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const SERIES_DAYS = 180;
/** Réponse de même forme sans chaîne (non configuré ou erreur). */
export function emptyYoutube(status, error, days, channelUrl, now = Date.now()) {
    const zero = { views: 0, minutes: 0, gained: 0, lost: 0, averageViewDuration: 0 };
    return { version: 1, status, error, generatedAt: new Date(now).toISOString(), channelUrl, channel: null, videos: [], days, start: '', end: '', totals: zero, previous: { ...zero }, series: [], traffic: [], analyticsError: null, site: null };
}
/** Visites et demandes venues de YouTube sur la période et la précédente ; `null` si le site ne compte rien. */
export async function siteSide(site, source, days, now) {
    if (!site?.visits && !site?.requests)
        return null;
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
export function youtubeClient(config, fetchFn = fetch) {
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
            const code = (await r.json().catch(() => ({}))).error ?? '';
            throw new Error(`youtube token ${r.status}${code === 'invalid_grant' ? ' (autorisation révoquée ou expirée : le propriétaire de la chaîne doit autoriser de nouveau l’accès)' : code ? ` ${code}` : ''}`);
        }
        const j = (await r.json());
        return { value: j.access_token, expiresInMs: j.expires_in * 1000 };
    });
    const get = async (url) => {
        const r = await fetchFn(url, { headers: { Authorization: `Bearer ${await tokens.get()}` }, signal: AbortSignal.timeout(20_000) });
        return json(r, 'youtube', (s) => (s === 403 ? ' (accès refusé : API non activée dans le projet Google Cloud, ou portée manquante)' : ''));
    };
    const report = (p) => get(`${analytics}/reports?${qs({ ids: 'channel==MINE', ...p })}`).then(tableRows);
    const channelData = (now) => cache.get(`channel:${ymd(now)}`, 3_600_000, async () => {
        const ch = (await get(`${api}/channels?${qs({ part: 'snippet,statistics,contentDetails', mine: 'true' })}`)).items?.[0];
        if (!ch)
            throw new Error('aucune chaîne pour ce compte Google');
        if (config.channelId && ch.id !== config.channelId)
            throw new Error(`le jeton donne accès à la chaîne ${ch.id}, pas à la chaîne attendue`);
        const s = ch.snippet ?? {}, st = ch.statistics ?? {};
        const handle = s.customUrl ?? null;
        const channel = {
            id: ch.id, title: s.title ?? ch.id, handle,
            url: config.channelUrl ?? (handle ? `https://www.youtube.com/${handle.startsWith('@') ? handle : `@${handle}`}` : `https://www.youtube.com/channel/${ch.id}`),
            studioUrl: `https://studio.youtube.com/channel/${ch.id}`,
            thumbnail: s.thumbnails?.['medium']?.url ?? s.thumbnails?.['default']?.url ?? null,
            subscribers: st.hiddenSubscriberCount ? null : Number(st.subscriberCount ?? 0), views: Number(st.viewCount ?? 0), videos: Number(st.videoCount ?? 0),
            createdAt: s.publishedAt ?? null,
        };
        const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
        const listed = uploads
            ? ((await get(`${api}/playlistItems?${qs({ part: 'contentDetails', maxResults: 50, playlistId: uploads })}`)).items ?? [])
                .map((i) => i.contentDetails?.videoId).filter((x) => !!x)
            : [];
        const extra = (await config.extraVideoIds?.()) ?? [];
        const ids = [...new Set([...listed, ...extra])].slice(0, 50);
        const apiVideos = ids.length ? ((await get(`${api}/videos?${qs({ part: 'snippet,statistics,contentDetails,status', id: ids.join(','), maxResults: 50 })}`)).items ?? []) : [];
        // un refus de YouTube Analytics n'empêche pas d'afficher la chaîne et ses vidéos
        const end = ymd(now - DAY), first = ymd(now - SERIES_DAYS * DAY);
        const since = channel.createdAt && channel.createdAt.slice(0, 10) < end ? channel.createdAt.slice(0, 10) : first;
        let analyticsError = null;
        const opt = (p, fallback) => p.catch((e) => ((analyticsError ??= errorMessage(e)), fallback));
        const [daily, perVideo, sources] = await Promise.all([
            opt(report({ startDate: first, endDate: end, metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost', dimensions: 'day', sort: 'day' }), []),
            apiVideos.length ? opt(report({ startDate: since, endDate: end, metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage', dimensions: 'video', sort: '-views', maxResults: 200 }), []) : Promise.resolve([]),
            opt(report({ startDate: ymd(now - 28 * DAY), endDate: end, metrics: 'views,estimatedMinutesWatched', dimensions: 'insightTrafficSourceType', sort: '-views' }), []),
        ]);
        const byDay = new Map(daily.map((r) => [String(r['day']), r]));
        const series = Array.from({ length: SERIES_DAYS }, (_, i) => {
            const date = ymd(now - (SERIES_DAYS - i) * DAY), r = byDay.get(date);
            return { date, views: Number(r?.['views'] ?? 0), minutes: Number(r?.['estimatedMinutesWatched'] ?? 0), gained: Number(r?.['subscribersGained'] ?? 0), lost: Number(r?.['subscribersLost'] ?? 0) };
        });
        const stats = new Map(perVideo.map((r) => [String(r['video']), r]));
        const videos = apiVideos.map((v) => {
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
    async function overview(days, site, now = Date.now()) {
        const n = Math.min(90, Math.max(1, Math.floor(days) || 28));
        const sideP = siteSide(site, source, n, now);
        try {
            const d = await channelData(now);
            const p = lastDays(d.series, n);
            return {
                version: 1, status: 'ok', error: null, generatedAt: new Date(now).toISOString(), channelUrl: d.channel.url, channel: d.channel, videos: d.videos,
                days: n, start: p.start, end: p.end, totals: p.totals, previous: p.previous, series: d.series, traffic: d.traffic, analyticsError: d.analyticsError, site: await sideP,
            };
        }
        catch (e) {
            return { ...emptyYoutube('error', errorMessage(e), n, config.channelUrl ?? null, now), site: await sideP };
        }
    }
    async function topVideo(start, end) {
        const d = await channelData(Date.now());
        const top = await cache.get(`top:${start}:${end}`, 3_600_000, () => report({ startDate: start, endDate: end, metrics: 'views', dimensions: 'video', sort: '-views', maxResults: 1 }));
        const v = d.videos.find((x) => x.id === top[0]?.['video']);
        return v ? { title: v.label ?? v.title, url: v.url, views: Number(top[0]['views']) } : null;
    }
    return { overview, topVideo, reset: () => { cache.clear(); tokens.reset(); } };
}
