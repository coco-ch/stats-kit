/*
 * Projection de la carte du monde, commune à la carte de la page (SVG) et à celle du rapport (PNG) : équirectangulaire, sans
 * l'Antarctique ni le Grand Nord (très étirés). Le fond de carte (Natural Earth 1:110m, domaine public) est un GeoJSON dont chaque
 * pays porte son code ISO alpha-2 dans `properties.iso2`.
 */

export const LAT_MAX = 84;
export const LAT_MIN = -58;

/** Rapport hauteur / largeur de la carte. */
export const MAP_RATIO = (LAT_MAX - LAT_MIN) / 360;

export type Ring = [number, number][];
export interface WorldFeature {
  properties: { iso2: string };
  geometry: { type: 'Polygon' | 'MultiPolygon' | string; coordinates: unknown };
}
export interface World {
  features: WorldFeature[];
}

/** Longitude et latitude → coordonnées dans une carte de largeur `w` (hauteur `w × MAP_RATIO`). */
export const project = (lon: number, lat: number, w: number): [number, number] => [
  ((lon + 180) / 360) * w,
  ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (w * MAP_RATIO),
];

/** Polygones d'un pays (anneau extérieur puis trous), qu'il soit Polygon ou MultiPolygon. */
export const polygonsOf = (f: WorldFeature): Ring[][] =>
  f.geometry.type === 'MultiPolygon' ? (f.geometry.coordinates as Ring[][]) : [f.geometry.coordinates as Ring[]];

/** Chemin SVG d'un pays, dans une carte de largeur `w`. */
export function featurePath(f: WorldFeature, w: number): string {
  return polygonsOf(f)
    .flatMap((rings) => rings.map((ring) => ring.map(([lon, lat], i) => {
      const [x, y] = project(lon, lat, w);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join('') + 'Z'))
    .join('');
}

/** Mélange de deux couleurs « #rrggbb » (t de 0 à 1). */
export function mixHex(a: string, b: string, t: number): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Intensité (0 à 1) d'un pays selon son nombre de visites : racine carrée, pour que les petits nombres restent visibles à côté
 * d'un pays dominant.
 */
export const intensity = (n: number, max: number): number => (n <= 0 ? 0 : max > 1 ? 0.15 + 0.85 * Math.sqrt((n - 1) / (max - 1)) : 1);
