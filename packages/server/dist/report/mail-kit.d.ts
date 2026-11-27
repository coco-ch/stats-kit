import { fill, type Texts } from 'stats-kit/contract';
import type { Palette } from './theme.ts';
/** Width of the message, in pixels. */
export declare const MAIL_WIDTH = 760;
/** Usable width of a full-width card (margins and border removed). */
export declare const CARD_INNER: number;
export declare const esc: (s: unknown) => string;
/** Escaped text, line breaks kept. */
export declare const escLines: (s: string) => string;
/** A figure of a row: value, label, line under it (HTML), optional image (HTML). */
export interface Figure {
    value: string;
    label: string;
    sub: string;
    image?: string;
    /** `warn`: something to do, the figure in amber. */
    tone?: 'warn';
}
/** Tone of a change: good news, bad news, neither. */
export type Tone = 'up' | 'down' | 'flat';
export declare function mailKit(C: Palette, texts: Texts): {
    trend: (now: number, before: number | null | undefined, lowerIsBetter?: boolean) => string;
    gap: (now: number, before: number | null | undefined, digits: number, unit: string | null, lowerIsBetter: boolean) => string;
    delta: (text: string, tone: Tone, arrow: "\u25B2" | "\u25BC" | "=") => string;
    box: (inner: string) => string;
    card: (inner: string) => string;
    row: (cells: string[]) => string;
    pairs: (cells: string[]) => string;
    split: (a: string, b: string) => string;
    h2: (title: string, hint?: string) => string;
    h3: (title: string) => string;
    spark: (cid: string, width: number, height: number) => string;
    kpi: (f: Figure, width: string) => string;
    kpiRow: (kpis: Figure[], columns?: number) => string;
    figures: (list: Figure[], columns?: number) => string;
    tiles: (list: Figure[], columns?: number) => string;
    list: (title: string, rows: [string, number][], hint?: string) => {
        inner: string;
        text: string;
    };
    grid: (head: string[], rows: string[][]) => string;
    moves: (rows: {
        label: string;
        tag: string;
        text: string;
        tone: Tone;
    }[]) => string;
    bars: (values: number[], first: string, last: string, titles: string[], previous?: number[] | null, legend?: [string, string]) => string;
    bullets: (lines: string[]) => string;
    heat: (gridValues: number[][], days: string[]) => string;
    button: (href: string, label: string) => string;
    header: (eyebrow: string, title: string, subtitle: string, logo: string) => string;
    headline: (text: string) => string;
    section: (title: string) => string;
    status: (tone: "ok" | "warn" | "down", title: string, lines: string[], rule: boolean) => string;
    note: (text: string) => string;
    callout: (html: string) => string;
    paragraph: (text: string) => string;
    footer: (text: string) => string;
    link: (url: string, label: string) => string;
    page: (title: string, preheader: string, rows: string) => string;
    fill: typeof fill;
    ts: (size: string, weight?: number, color?: string, family?: string, more?: string, extraClass?: string) => string;
};
export type MailKit = ReturnType<typeof mailKit>;
export { fill };
