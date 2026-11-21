/** Outils communs aux connecteurs : appel HTTP avec délai, cache en mémoire, jeton partagé entre appels simultanés. */

/** Fonction `fetch` (remplaçable dans les tests ou derrière un proxy). */
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Erreur d'une source, avec le code HTTP s'il y en a un. */
export class SourceError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'SourceError';
    this.status = status;
  }
}

/** Message court d'une erreur, sans pile. */
export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** Cache en mémoire à durée de vie ; une même clé demandée deux fois en même temps ne charge qu'une fois. */
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
        // au-delà de 200 entrées, on oublie les plus anciennes
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

/** Jeton d'accès gardé jusqu'à son expiration (moins une minute) ; un seul renouvellement à la fois. */
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

/** Lit une réponse JSON ou lève une `SourceError` lisible (avec un extrait du corps). */
export async function json<T>(r: Response, what: string, hint: (status: number) => string = () => ''): Promise<T> {
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new SourceError(`${what} ${r.status}${hint(r.status)}${detail ? ` ${detail.slice(0, 200)}` : ''}`, r.status);
  }
  return (await r.json()) as T;
}

/** Paramètres d'adresse. */
export const qs = (p: Record<string, string | number | undefined>): string =>
  new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();

/** Une promesse qui ne fait pas échouer l'ensemble : sa valeur de repli en cas d'erreur. */
export const settle = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);
