/*
 * World map projection, shared by the page map (SVG) and the report map (PNG): equirectangular, without Antarctica or the far
 * north (very stretched). The base map (Natural Earth 1:110m, public domain) is a GeoJSON in which each country carries its ISO
 * alpha-2 code in `properties.iso2`.
 */
export const LAT_MAX = 84;
export const LAT_MIN = -58;
/** Height / width ratio of the map. */
export const MAP_RATIO = (LAT_MAX - LAT_MIN) / 360;
/** Longitude and latitude → coordinates in a map of width `w` (height `w × MAP_RATIO`). */
export const project = (lon, lat, w) => [
    ((lon + 180) / 360) * w,
    ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (w * MAP_RATIO),
];
/** Polygons of a country (outer ring, then holes), Polygon or MultiPolygon. */
export const polygonsOf = (f) => f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
/** SVG path of a country, in a map of width `w`. */
export function featurePath(f, w) {
    return polygonsOf(f)
        .flatMap((rings) => rings.map((ring) => ring.map(([lon, lat], i) => {
        const [x, y] = project(lon, lat, w);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join('') + 'Z'))
        .join('');
}
/** Mix of two "#rrggbb" colours (t from 0 to 1). */
export function mixHex(a, b, t) {
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [rgb(a), rgb(b)];
    return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
/**
 * Intensity (0 to 1) of a country from its number of visits: square root, so that small numbers stay visible next to a dominant
 * country.
 */
export const intensity = (n, max) => (n <= 0 ? 0 : max > 1 ? 0.15 + 0.85 * Math.sqrt((n - 1) / (max - 1)) : 1);
