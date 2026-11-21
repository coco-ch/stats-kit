/** Tools shared by the connectors: HTTP call with timeout, in-memory cache, token shared by simultaneous calls. */
/** Error of a source, with the HTTP status if there is one. */
export class SourceError extends Error {
    status;
    constructor(message, status = null) {
        super(message);
        this.name = 'SourceError';
        this.status = status;
    }
}
/** Short message of an error, without stack. */
export const errorMessage = (e) => (e instanceof Error ? e.message : String(e)).slice(0, 300);
/** In-memory cache with a time to live; a key requested twice at the same time loads once. */
export class Cache {
    entries = new Map();
    pending = new Map();
    now;
    constructor(now = Date.now) {
        this.now = now;
    }
    async get(key, ttlMs, load) {
        const hit = this.entries.get(key);
        if (hit && this.now() - hit.at < ttlMs)
            return hit.value;
        const running = this.pending.get(key);
        if (running)
            return running;
        const p = load()
            .then((value) => {
            this.entries.set(key, { at: this.now(), value });
            // beyond 200 entries, forget the oldest
            if (this.entries.size > 200)
                this.entries.delete(this.entries.keys().next().value);
            return value;
        })
            .finally(() => this.pending.delete(key));
        this.pending.set(key, p);
        return p;
    }
    clear() {
        this.entries.clear();
    }
}
/** Access token kept until it expires (minus one minute); one renewal at a time. */
export class TokenHolder {
    token = null;
    running = null;
    fetchToken;
    now;
    constructor(fetchToken, now = Date.now) {
        this.fetchToken = fetchToken;
        this.now = now;
    }
    get() {
        if (this.token && this.token.until > this.now() + 60_000)
            return Promise.resolve(this.token.value);
        this.running ??= this.fetchToken()
            .then((t) => {
            this.token = { value: t.value, until: this.now() + t.expiresInMs };
            return t.value;
        })
            .finally(() => (this.running = null));
        return this.running;
    }
    reset() {
        this.token = null;
    }
}
/** Reads a JSON response or throws a readable `SourceError` (with an excerpt of the body). */
export async function json(r, what, hint = () => '') {
    if (!r.ok) {
        const detail = await r.text().catch(() => '');
        throw new SourceError(`${what} ${r.status}${hint(r.status)}${detail ? ` ${detail.slice(0, 200)}` : ''}`, r.status);
    }
    return (await r.json());
}
/** Query string parameters. */
export const qs = (p) => new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
/** A promise that does not make the whole fail: its fallback value on error. */
export const settle = (p, fallback) => p.catch(() => fallback);
