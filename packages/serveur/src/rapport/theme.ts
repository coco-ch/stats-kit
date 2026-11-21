/** Couleurs, polices et logo du rapport par e-mail. Seule `brand` est nécessaire : les autres teintes en découlent. */
import { mixHex } from 'stats-kit/contrat';

export interface ReportTheme {
  /** Couleur de la marque, « #rrggbb » : en-tête, barres, boutons. */
  brand: string;
  /** Couleur de l'en-tête (défaut : `brand`). */
  head?: string;
  headText?: string;
  headMuted?: string;
  eyebrow?: string;
  /** Barres des classements (défaut : marque éclaircie). */
  accent?: string;
  /** Fond des cases peu chargées de la carte de chaleur. */
  soft?: string;
  ink?: string;
  text?: string;
  muted?: string;
  line?: string;
  page?: string;
  card?: string;
  up?: string;
  down?: string;
  /** Pile de polices du texte. */
  font?: string;
  /** Pile de polices des titres et chiffres. */
  display?: string;
  /** Logo de l'en-tête : PNG joint au message (`png`) ou image en ligne (`url`). */
  logo?: { png?: Uint8Array; url?: string; width?: number; height?: number; alt?: string };
}

/** Thème complet, toutes teintes calculées. */
export type Palette = Required<Omit<ReportTheme, 'logo'>> & { accentDeep: string; logo: ReportTheme['logo'] | null };

const HEX = /^#[0-9a-f]{6}$/i;

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
  };
}

/** « #rrggbb » → [r, g, b]. */
export const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
