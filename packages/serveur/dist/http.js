/** Outils communs aux connecteurs : appel HTTP avec délai, cache en mémoire, jeton partagé entre appels simultanés. */
/** Erreur d'une source, avec le code HTTP s'il y en a un. */
export class SourceError extends Error {
    status;
    constructor(message, status = null) {
        super(message);
        this.name = 'SourceError';
        this.status = status;
    }
}
/** Message court d'une erreur, sans pile. */
export const errorMessage = (e) => (e instanceof Error ? e.message : String(e)).slice(0, 300);
/** Cache en mémoire à durée de vie ; une même clé demandée deux fois en même temps ne charge qu'une fois. */
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
            // au-delà de 200 entrées, on oublie les plus anciennes
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
/** Jeton d'accès gardé jusqu'à son expiration (moins une minute) ; un seul renouvellement à la fois. */
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
/** Lit une réponse JSON ou lève une `SourceError` lisible (avec un extrait du corps). */
export async function json(r, what, hint = () => '') {
    if (!r.ok) {
        const detail = await r.text().catch(() => '');
        throw new SourceError(`${what} ${r.status}${hint(r.status)}${detail ? ` ${detail.slice(0, 200)}` : ''}`, r.status);
    }
    return (await r.json());
}
/** Paramètres d'adresse. */
export const qs = (p) => new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
/** Une promesse qui ne fait pas échouer l'ensemble : sa valeur de repli en cas d'erreur. */
export const settle = (p, fallback) => p.catch(() => fallback);
