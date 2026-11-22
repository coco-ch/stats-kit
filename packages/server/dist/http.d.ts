/** Tools shared by the connectors: HTTP call with timeout, in-memory cache, token shared by simultaneous calls. */
/** `fetch` function (replaceable in tests or behind a proxy). */
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
/** Error of a source, with the HTTP status if there is one. */
export declare class SourceError extends Error {
    readonly status: number | null;
    constructor(message: string, status?: number | null);
}
/** Short message of an error, without stack. */
export declare const errorMessage: (e: unknown) => string;
/**
 * In-memory cache with a time to live; a key requested twice at the same time loads once. A load that fails is never kept, nor a
 * value refused by `keep` (an answer that reports an error): the next call reads the source again.
 */
export declare class Cache {
    private readonly entries;
    private readonly pending;
    private readonly now;
    constructor(now?: () => number);
    get<T>(key: string, ttlMs: number, load: () => Promise<T>, keep?: (value: T) => boolean): Promise<T>;
    clear(): void;
}
/** Access token kept until it expires (minus one minute); one renewal at a time. */
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
/** Reads a JSON response or throws a readable `SourceError` (with an excerpt of the body). */
export declare function json<T>(r: Response, what: string, hint?: (status: number) => string): Promise<T>;
/** Query string parameters. */
export declare const qs: (p: Record<string, string | number | undefined>) => string;
/** A promise that does not make the whole fail: its fallback value on error. */
export declare const settle: <T>(p: Promise<T>, fallback: T) => Promise<T>;
