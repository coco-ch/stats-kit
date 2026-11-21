import { type World } from 'stats-kit/contrat';
type RGB = [number, number, number];
export interface MapColors {
    background: RGB;
    land: RGB;
    border: RGB;
    low: RGB;
    high: RGB;
}
/** Fond de carte livré avec la librairie (Natural Earth 1:110m, domaine public). */
export declare const worldFile: () => URL;
/** Lit un fond de carte ; celui de la librairie n'est lu qu'une fois. */
export declare function loadWorld(file?: URL | string): World;
/** Pixels RVB (8 bits) → PNG. */
export declare function encodePng(rgb: Uint8Array, width: number, height: number): Buffer;
/** Dessine la carte : pays visités colorés selon leurs visites, pastilles sur les petits pays. */
export declare function renderWorldMap(countries: {
    key: string;
    value: number;
}[], w: World, colors: MapColors, width?: number): {
    png: Buffer;
    width: number;
    height: number;
};
export {};
