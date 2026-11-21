/** Tools shared by the connectors: HTTP call with timeout, in-memory cache, token shared by simultaneous calls. */

/** `fetch` function (replaceable in tests or behind a proxy). */
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Error of a source, with the HTTP status if there is one. */
export class SourceError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'SourceError';
    this.status = status;
  }
}

/** Short message of an error, without stack. */
export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** In-memory cache with a time to live; a key requested twice at the same time loads once. */
export class Cache {
  private readonly entries = new Map<string, { at: number; value: unknown }>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly now: () => number;
  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && this.now() - hit.at < ttlMs) return hit.value as T;
    const running = this.pending.get(key);
    if (running) return running as Promise<T>;
    const p = load()
      .then((value) => {
        this.entries.set(key, { at: this.now(), value });
        // beyond 200 entries, forget the oldest
        if (this.entries.size > 200) this.entries.delete(this.entries.keys().next().value as string);
        return value;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, p);
    return p;
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Access token kept until it expires (minus one minute); one renewal at a time. */
export class TokenHolder {
  private token: { value: string; until: number } | null = null;
  private running: Promise<string> | null = null;
  private readonly fetchToken: () => Promise<{ value: string; expiresInMs: number }>;
  private readonly now: () => number;
  constructor(fetchToken: () => Promise<{ value: string; expiresInMs: number }>, now: () => number = Date.now) {
    this.fetchToken = fetchToken;
    this.now = now;
  }

  get(): Promise<string> {
    if (this.token && this.token.until > this.now() + 60_000) return Promise.resolve(this.token.value);
    this.running ??= this.fetchToken()
      .then((t) => {
        this.token = { value: t.value, until: this.now() + t.expiresInMs };
        return t.value;
      })
      .finally(() => (this.running = null));
    return this.running;
  }

  reset(): void {
    this.token = null;
  }
}

/** Reads a JSON response or throws a readable `SourceError` (with an excerpt of the body). */
export async function json<T>(r: Response, what: string, hint: (status: number) => string = () => ''): Promise<T> {
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new SourceError(`${what} ${r.status}${hint(r.status)}${detail ? ` ${detail.slice(0, 200)}` : ''}`, r.status);
  }
  return (await r.json()) as T;
}

/** Query string parameters. */
export const qs = (p: Record<string, string | number | undefined>): string =>
  new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();

/** A promise that does not make the whole fail: its fallback value on error. */
export const settle = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);
