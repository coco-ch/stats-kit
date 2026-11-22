import type { GscConfig } from './gsc.ts';
import type { UmamiConfig } from './umami.ts';
import type { YoutubeConfig } from './youtube.ts';
type Env = Record<string, string | undefined>;
export declare function umamiFromEnv(env?: Env): UmamiConfig | null;
export declare function gscFromEnv(env?: Env): GscConfig | null;
export declare function youtubeFromEnv(env?: Env): YoutubeConfig | null;
/** The three sources at once: `createStatsKit({ siteName, ...sourcesFromEnv() })`. */
export declare const sourcesFromEnv: (env?: Env) => {
    umami: UmamiConfig | null;
    gsc: GscConfig | null;
    youtube: YoutubeConfig | null;
};
export {};
