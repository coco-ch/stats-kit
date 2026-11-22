export declare const LAT_MAX = 84;
export declare const LAT_MIN = -58;
/** Height / width ratio of the map. */
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
/** Longitude and latitude → coordinates in a map of width `w` (height `w × MAP_RATIO`). */
export declare const project: (lon: number, lat: number, w: number) => [number, number];
/** Polygons of a country (outer ring, then holes), Polygon or MultiPolygon. */
export declare const polygonsOf: (f: WorldFeature) => Ring[][];
/** SVG path of a country, in a map of width `w`. */
export declare function featurePath(f: WorldFeature, w: number): string;
/** Mix of two "#rrggbb" colours (t from 0 to 1). */
export declare function mixHex(a: string, b: string, t: number): string;
/**
 * Intensity (0 to 1) of a country from its number of visits: square root, so that small numbers stay visible next to a dominant
 * country.
 */
export declare const intensity: (n: number, max: number) => number;
