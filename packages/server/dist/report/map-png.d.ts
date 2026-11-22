import { type World } from 'stats-kit/contract';
type RGB = [number, number, number];
export interface MapColors {
    background: RGB;
    land: RGB;
    border: RGB;
    low: RGB;
    high: RGB;
}
/** Base map shipped with the library (Natural Earth 1:110m, public domain). */
export declare const worldFile: () => URL;
/** Reads a base map; the library's one is read only once. */
export declare function loadWorld(file?: URL | string): World;
/** RGB pixels (8 bits) → PNG. */
export declare function encodePng(rgb: Uint8Array, width: number, height: number): Buffer;
/** Draws the map: visited countries coloured by their visits, dots on small countries. */
export declare function renderWorldMap(countries: {
    key: string;
    value: number;
}[], w: World, colors: MapColors, width?: number): {
    png: Buffer;
    width: number;
    height: number;
};
export {};
