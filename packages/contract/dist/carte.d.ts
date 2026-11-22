export declare const LAT_MAX = 84;
export declare const LAT_MIN = -58;
/** Rapport hauteur / largeur de la carte. */
export declare const MAP_RATIO: number;
export type Ring = [number, number][];
export interface WorldFeature {
    properties: {
        iso2: string;
    };
    geometry: {
        type: 'Polygon' | 'MultiPolygon' | string;
        coordinates: unknown;
    };
}
export interface World {
    features: WorldFeature[];
}
/** Longitude et latitude → coordonnées dans une carte de largeur `w` (hauteur `w × MAP_RATIO`). */
export declare const project: (lon: number, lat: number, w: number) => [number, number];
/** Polygones d'un pays (anneau extérieur puis trous), qu'il soit Polygon ou MultiPolygon. */
export declare const polygonsOf: (f: WorldFeature) => Ring[][];
/** Chemin SVG d'un pays, dans une carte de largeur `w`. */
export declare function featurePath(f: WorldFeature, w: number): string;
/** Mélange de deux couleurs « #rrggbb » (t de 0 à 1). */
export declare function mixHex(a: string, b: string, t: number): string;
/**
 * Intensité (0 à 1) d'un pays selon son nombre de visites : racine carrée, pour que les petits nombres restent visibles à côté
 * d'un pays dominant.
 */
export declare const intensity: (n: number, max: number) => number;
