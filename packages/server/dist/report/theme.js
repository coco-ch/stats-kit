/** Colours, fonts and logo of the e-mail report. Only `brand` is required: the other shades derive from it. */
import { mixHex } from 'stats-kit/contract';
const HEX = /^#[0-9a-f]{6}$/i;
const hexOr = (v, fallback) => (v && HEX.test(v) ? v : fallback);
export function palette(t) {
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
    };
}
/** "#rrggbb" → [r, g, b]. */
export const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
