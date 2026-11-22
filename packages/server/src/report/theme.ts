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
  /** Highlighted site data (requests to handle…): background and text of its line (default: amber, as on the Statistics page). */
  warnSoft?: string;
  warnInk?: string;
  /** Colours of the PNG world map, "#rrggbb" (default: derived from `brand`): sea, land, borders, few visits, many visits. */
  map?: { background?: string; land?: string; border?: string; low?: string; high?: string };
  /** Header logo: PNG attached to the message (`png`) or online image (`url`). */
  logo?: { png?: Uint8Array; url?: string; width?: number; height?: number; alt?: string };
  /**
   * Colours in dark mode, for the mail clients that apply a style sheet (Apple Mail, iOS, Outlook.com…), "#rrggbb". Default:
   * dark neutral backgrounds, light texts, the brand lightened for links. The header keeps its colours.
   */
  dark?: Partial<DarkColors>;
}

/** Colours of the report in dark mode. */
export interface DarkColors {
  page: string;
  card: string;
  line: string;
  soft: string;
  ink: string;
  text: string;
  muted: string;
  accent: string;
  up: string;
  down: string;
}

/** Complete theme, all shades computed. */
export type Palette = Required<Omit<ReportTheme, 'logo' | 'map' | 'dark'>> & { accentDeep: string; logo: ReportTheme['logo'] | null; map: Required<NonNullable<ReportTheme['map']>>; dark: DarkColors };

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
    warnSoft: hexOr(t.warnSoft, '#fff3d6'),
    warnInk: hexOr(t.warnInk, '#5a3b00'),
    logo: t.logo ?? null,
    map: {
      background: hexOr(t.map?.background, mixHex(brand, '#ffffff', 0.94)),
      land: hexOr(t.map?.land, mixHex(brand, '#d9dce4', 0.86)),
      border: hexOr(t.map?.border, '#ffffff'),
      low: hexOr(t.map?.low, mixHex(brand, '#ffffff', 0.65)),
      high: hexOr(t.map?.high, brand),
    },
    dark: {
      page: hexOr(t.dark?.page, '#111318'),
      card: hexOr(t.dark?.card, '#1b1e26'),
      line: hexOr(t.dark?.line, '#2e323d'),
      soft: hexOr(t.dark?.soft, mixHex(brand, '#1b1e26', 0.8)),
      ink: hexOr(t.dark?.ink, '#f3f4f8'),
      text: hexOr(t.dark?.text, '#d5d9e2'),
      muted: hexOr(t.dark?.muted, '#a3aab8'),
      accent: hexOr(t.dark?.accent, mixHex(brand, '#ffffff', 0.4)),
      up: hexOr(t.dark?.up, '#4fc28e'),
      down: hexOr(t.dark?.down, '#ff8a80'),
    },
  };
}

/** "#rrggbb" → [r, g, b]. */
export const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
