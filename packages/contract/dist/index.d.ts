/** Data contract, texts in several languages and pure functions shared by the server and the components. */
export type * from './types.ts';
export * from './texts.ts';
export * from './format.ts';
export * from './analysis.ts';
export * from './map.ts';
export { CENTROIDS } from './centroids.ts';
/** Version of the contract produced by this library. */
export declare const CONTRACT_VERSION: 1;
/** @deprecated since 0.2.0, use `CENTROIDS`. */
export declare const CENTROIDES: Readonly<Record<string, readonly [number, number]>>;
