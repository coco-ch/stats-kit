/** Data contract, texts in several languages and pure functions shared by the server and the components. */
export type * from './types.ts';
export * from './texts.ts';
export * from './format.ts';
export * from './analysis.ts';
export * from './map.ts';
export { CENTROIDS } from './centroids.ts';
import { CENTROIDS } from './centroids.ts';

/** Version of the contract produced by this library. */
export const CONTRACT_VERSION = 1 as const;

/** @deprecated since 0.2.0, use `CENTROIDS`. */
export const CENTROIDES = CENTROIDS;
