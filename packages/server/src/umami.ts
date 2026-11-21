/*
 * Umami connector (API v2 and v3, self-hosted or Umami Cloud), read-only. The service account signs in once; its token is
 * shared by simultaneous calls and renewed on a 401.
 */
import { SourceError, json, qs, type Fetch } from './http.ts';

export interface UmamiConfig {
  /** Umami address ("https://umami.example.org"); the API is under /api. For Umami Cloud: "https://api.umami.is/v1" with `apiKey`. */
  url: string;
  /** Website id in Umami. */
  websiteId: string;
  /** Service account (read-only) of a self-hosted Umami. */
  username?: string;
  password?: string;
  /** API key (Umami Cloud): replaces the service account. */
  apiKey?: string;
  /** Dashboard opened by the "Open Umami" button; `false` to hide it. Default: {url}/websites/{websiteId}. */
  dashboardUrl?: string | false;
  /** Timeout of a call, in milliseconds (15 s by default). */
  timeoutMs?: number;
}

export type Point = { x: string; y: number };
export interface UmamiStats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}
export interface Expanded {
  name: string;
  pageviews: number | string;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}
export interface UmamiSession {
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  views?: number;
  lastAt?: string | null;
  createdAt?: string | null;
}

export const umamiConfigured = (c: UmamiConfig | null | undefined): c is UmamiConfig =>
  !!(c && c.url && c.websiteId && (c.apiKey || (c.username && c.password)));

/** Value of an Umami total: number, or `{ value, prev }` object of older 2.x versions. */
const val = (v: unknown): number => (typeof v === 'number' ? v : v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'number' ? (v as { value: number }).value : 0);

/** Totals of a `stats` response, whatever the Umami version. */
export const parseStats = (s: Record<string, unknown> | null | undefined): UmamiStats => ({
  pageviews: val(s?.['pageviews']),
  visitors: val(s?.['visitors']),
  visits: val(s?.['visits']),
  bounces: val(s?.['bounces']),
  totaltime: val(s?.['totaltime']),
});

export interface UmamiClient {
  readonly config: UmamiConfig;
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  /** Ranking of a dimension; "path" is retried as "url" (Umami 2) if Umami refuses it. */
  metric(type: string, startAt: number, endAt: number, limit?: number, extra?: Record<string, string>): Promise<Point[]>;
  /** Forgets the token (tests). */
  reset(): void;
}

/**
 * True when the connector signs in with the account a new self-hosted Umami is installed with (admin / umami): anyone can then
 * sign in to it. The library only warns (see "Securing a new Umami" in the README): it never changes a password itself.
 */
export const umamiDefaultAccount = (c: UmamiConfig): boolean => !c.apiKey && c.username === 'admin' && c.password === 'umami';

export function umamiClient(config: UmamiConfig, fetchFn: Fetch = fetch): UmamiClient {
  // the warning names neither the password nor the account it was given
  if (umamiDefaultAccount(config)) console.warn('[stats-kit] Umami: the connector signs in with the default account of a new Umami. Change its password and use a read-only account (README, "Securing a new Umami").');
  const base = config.url.replace(/\/+$/, '');
  const api = config.apiKey ? base : `${base}/api`;
  const timeout = config.timeoutMs ?? 15_000;
  let token: string | null = null;
  let signingIn: Promise<string> | null = null;
  let pathType: 'path' | 'url' = 'path';

  async function signIn(): Promise<string> {
    const r = await fetchFn(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: config.username, password: config.password }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!r.ok) throw new SourceError(`umami login ${r.status}`, r.status);
    return (token = ((await r.json()) as { token: string }).token);
  }
  const login = () => (signingIn ??= signIn().finally(() => (signingIn = null)));

  async function headers(): Promise<Record<string, string>> {
    if (config.apiKey) return { 'x-umami-api-key': config.apiKey, Accept: 'application/json' };
    return { Authorization: `Bearer ${token ?? (await login())}`, Accept: 'application/json' };
  }

  async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const q = qs(params);
    const url = `${api}/websites/${encodeURIComponent(config.websiteId)}/${path}${q ? `?${q}` : ''}`;
    const send = async () => fetchFn(url, { headers: await headers(), signal: AbortSignal.timeout(timeout) });
    let r = await send();
    if (r.status === 401 && !config.apiKey) {
      token = null; // expired token: sign in again once
      r = await send();
    }
    return json<T>(r, `umami ${path}`);
  }

  async function metric(type: string, startAt: number, endAt: number, limit = 10, extra: Record<string, string> = {}): Promise<Point[]> {
    const t = type === 'path' ? pathType : type;
    try {
      return await get<Point[]>('metrics', { startAt, endAt, type: t, limit, ...extra });
    } catch (e) {
      if (type === 'path' && pathType === 'path' && e instanceof SourceError && e.status === 400) {
        pathType = 'url'; // Umami 2: the dimension is called "url"
        return get<Point[]>('metrics', { startAt, endAt, type: 'url', limit, ...extra });
      }
      throw e;
    }
  }

  return { config, get, metric, reset: () => { token = null; pathType = 'path'; } };
}
