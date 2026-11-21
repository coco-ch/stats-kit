/*
 * Umami connector (API v2 and v3, self-hosted or Umami Cloud), read-only. The service account signs in once; its token is
 * shared by simultaneous calls and renewed on a 401.
 */
import { SourceError, json, qs } from "./http.js";
export const umamiConfigured = (c) => !!(c && c.url && c.websiteId && (c.apiKey || (c.username && c.password)));
/** Value of an Umami total: number, or `{ value, prev }` object of older 2.x versions. */
const val = (v) => (typeof v === 'number' ? v : v && typeof v === 'object' && typeof v.value === 'number' ? v.value : 0);
/** Totals of a `stats` response, whatever the Umami version. */
export const parseStats = (s) => ({
    pageviews: val(s?.['pageviews']),
    visitors: val(s?.['visitors']),
    visits: val(s?.['visits']),
    bounces: val(s?.['bounces']),
    totaltime: val(s?.['totaltime']),
});
export function umamiClient(config, fetchFn = fetch) {
    const base = config.url.replace(/\/+$/, '');
    const api = config.apiKey ? base : `${base}/api`;
    const timeout = config.timeoutMs ?? 15_000;
    let token = null;
    let signingIn = null;
    let pathType = 'path';
    async function signIn() {
        const r = await fetchFn(`${api}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: config.username, password: config.password }),
            signal: AbortSignal.timeout(timeout),
        });
        if (!r.ok)
            throw new SourceError(`umami login ${r.status}`, r.status);
        return (token = (await r.json()).token);
    }
    const login = () => (signingIn ??= signIn().finally(() => (signingIn = null)));
    async function headers() {
        if (config.apiKey)
            return { 'x-umami-api-key': config.apiKey, Accept: 'application/json' };
        return { Authorization: `Bearer ${token ?? (await login())}`, Accept: 'application/json' };
    }
    async function get(path, params = {}) {
        const q = qs(params);
        const url = `${api}/websites/${encodeURIComponent(config.websiteId)}/${path}${q ? `?${q}` : ''}`;
        const send = async () => fetchFn(url, { headers: await headers(), signal: AbortSignal.timeout(timeout) });
        let r = await send();
        if (r.status === 401 && !config.apiKey) {
            token = null; // expired token: sign in again once
            r = await send();
        }
        return json(r, `umami ${path}`);
    }
    async function metric(type, startAt, endAt, limit = 10, extra = {}) {
        const t = type === 'path' ? pathType : type;
        try {
            return await get('metrics', { startAt, endAt, type: t, limit, ...extra });
        }
        catch (e) {
            if (type === 'path' && pathType === 'path' && e instanceof SourceError && e.status === 400) {
                pathType = 'url'; // Umami 2: the dimension is called "url"
                return get('metrics', { startAt, endAt, type: 'url', limit, ...extra });
            }
            throw e;
        }
    }
    return { config, get, metric, reset: () => { token = null; pathType = 'path'; } };
}
