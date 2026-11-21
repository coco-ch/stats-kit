/** Outils communs aux connecteurs : appel HTTP avec délai, cache en mémoire, jeton partagé entre appels simultanés. */
/** Fonction `fetch` (remplaçable dans les tests ou derrière un proxy). */
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
/** Erreur d'une source, avec le code HTTP s'il y en a un. */
export declare class SourceError extends Error {
    readonly status: number | null;
    constructor(message: string, status?: number | null);
}
/** Message court d'une erreur, sans pile. */
export declare const errorMessage: (e: unknown) => string;
/** Cache en mémoire à durée de vie ; une même clé demandée deux fois en même temps ne charge qu'une fois. */
export declare class Cache {
    private readonly entries;
    private readonly pending;
    private readonly now;
    constructor(now?: () => number);
    get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T>;
    clear(): void;
}
/** Jeton d'accès gardé jusqu'à son expiration (moins une minute) ; un seul renouvellement à la fois. */
export declare class TokenHolder {
    private token;
    private running;
    private readonly fetchToken;
    private readonly now;
    constructor(fetchToken: () => Promise<{
        value: string;
        expiresInMs: number;
    }>, now?: () => number);
    get(): Promise<string>;
    reset(): void;
}
/** Lit une réponse JSON ou lève une `SourceError` lisible (avec un extrait du corps). */
export declare function json<T>(r: Response, what: string, hint?: (status: number) => string): Promise<T>;
/** Paramètres d'adresse. */
export declare const qs: (p: Record<string, string | number | undefined>) => string;
/** Une promesse qui ne fait pas échouer l'ensemble : sa valeur de repli en cas d'erreur. */
export declare const settle: <T>(p: Promise<T>, fallback: T) => Promise<T>;
