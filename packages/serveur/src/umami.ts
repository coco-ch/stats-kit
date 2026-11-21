/*
 * Connecteur Umami (API v2 et v3, auto-hébergé ou Umami Cloud), en lecture seule. Le compte de service se connecte une fois ;
 * son jeton est partagé par les appels simultanés et renouvelé sur un refus 401.
 */
import { SourceError, json, qs, type Fetch } from './http.ts';

export interface UmamiConfig {
  /** Adresse d'Umami (« https://umami.exemple.org ») ; l'API est sous /api. Pour Umami Cloud : « https://api.umami.is/v1 » avec `apiKey`. */
  url: string;
  /** Identifiant du site dans Umami. */
  websiteId: string;
  /** Compte de service (lecture) d'un Umami auto-hébergé. */
  username?: string;
  password?: string;
  /** Clé d'API (Umami Cloud) : remplace le compte de service. */
  apiKey?: string;
  /** Tableau de bord ouvert par le bouton « Ouvrir Umami » ; `false` pour ne pas l'afficher. Défaut : {url}/websites/{websiteId}. */
  dashboardUrl?: string | false;
  /** Délai d'attente d'un appel, en millisecondes (15 s par défaut). */
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

/** Valeur d'un total Umami : nombre, ou objet `{ value, prev }` des versions 2.x anciennes. */
const val = (v: unknown): number => (typeof v === 'number' ? v : v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'number' ? (v as { value: number }).value : 0);

/** Totaux d'une réponse `stats`, quelle que soit la version d'Umami. */
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
  /** Classement d'une dimension ; « path » est retenté en « url » (Umami 2) si Umami le refuse. */
  metric(type: string, startAt: number, endAt: number, limit?: number, extra?: Record<string, string>): Promise<Point[]>;
  /** Oublie le jeton (tests). */
  reset(): void;
}

export function umamiClient(config: UmamiConfig, fetchFn: Fetch = fetch): UmamiClient {
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
      token = null; // jeton expiré : on se reconnecte une fois
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
        pathType = 'url'; // Umami 2 : la dimension s'appelle « url »
        return get<Point[]>('metrics', { startAt, endAt, type: 'url', limit, ...extra });
      }
      throw e;
    }
  }

  return { config, get, metric, reset: () => { token = null; pathType = 'path'; } };
}
