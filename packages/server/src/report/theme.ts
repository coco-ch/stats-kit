/** Colours, fonts and logo of the e-mail report. Only `brand` is required: the other shades derive from it. */
import { mixHex } from 'stats-kit/contract';

export interface ReportTheme {
  /** Brand colour, "#rrggbb": header, bars, buttons. */
  brand: string;
  /** Header colour (default: `brand`). */
  head?: string;
  headText?: string;
  headMuted?: string;
  eyebrow?: string;
  /** Ranking bars (default: lightened brand). */
  accent?: string;
  /** Background of the lightly loaded heatmap cells. */
  soft?: string;
  ink?: string;
  text?: string;
  muted?: string;
  line?: string;
  page?: string;
  card?: string;
  up?: string;
  down?: string;
  /** Font stack of the text. */
  font?: string;
  /** Font stack of titles and figures. */
  display?: string;
  /** Colours of the PNG world map, "#rrggbb" (default: derived from `brand`): sea, land, borders, few visits, many visits. */
  map?: { background?: string; land?: string; border?: string; low?: string; high?: string };
  /** Header logo: PNG attached to the message (`png`) or online image (`url`). */
  logo?: { png?: Uint8Array; url?: string; width?: number; height?: number; alt?: string };
}

/** Complete theme, all shades computed. */
export type Palette = Required<Omit<ReportTheme, 'logo' | 'map'>> & { accentDeep: string; logo: ReportTheme['logo'] | null; map: Required<NonNullable<ReportTheme['map']>> };

const HEX = /^#[0-9a-f]{6}$/i;
const hexOr = (v: string | undefined, fallback: string) => (v && HEX.test(v) ? v : fallback);

export function palette(t: ReportTheme): Palette {
  const brand = HEX.test(t.brand) ? t.brand : '#2f5bd3';
  return {
    brand,
    head: t.head ?? brand,
    headText: t.headText ?? '#ffffff',
    headMuted: t.headMuted ?? mixHex(brand, '#ffffff', 0.82),
    eyebrow: t.eyebrow ?? mixHex(brand, '#ffffff', 0.7),
    accent: t.accent ?? mixHex(brand, '#ffffff', 0.35),
    accentDeep: brand,
    soft: t.soft ?? mixHex(brand, '#ffffff', 0.85),
    ink: t.ink ?? '#141a2a',
    text: t.text ?? '#252d40',
    muted: t.muted ?? '#5a6274',
    line: t.line ?? '#e3e6ee',
    page: t.page ?? '#f4f5f9',
    card: t.card ?? '#ffffff',
    up: t.up ?? '#0b7a5c',
    down: t.down ?? '#b3261e',
    font: t.font ?? "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    display: t.display ?? "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    logo: t.logo ?? null,
    map: {
      background: hexOr(t.map?.background, mixHex(brand, '#ffffff', 0.94)),
      land: hexOr(t.map?.land, mixHex(brand, '#d9dce4', 0.86)),
      border: hexOr(t.map?.border, '#ffffff'),
      low: hexOr(t.map?.low, mixHex(brand, '#ffffff', 0.65)),
      high: hexOr(t.map?.high, brand),
    },
  };
}

/** "#rrggbb" → [r, g, b]. */
export const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
