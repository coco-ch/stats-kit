import { fill, type Texts } from 'stats-kit/contract';
import type { Palette } from './theme.ts';
/** Width of the message, in pixels. */
export declare const MAIL_WIDTH = 760;
/** Usable width of a full-width card (margins and border removed). */
export declare const CARD_INNER: number;
export declare const esc: (s: unknown) => string;
/** Escaped text, line breaks kept. */
export declare const escLines: (s: string) => string;
export declare function mailKit(C: Palette, texts: Texts): {
    trend: (now: number, before: number | null | undefined) => string;
    box: (inner: string) => string;
    card: (inner: string) => string;
    row: (cells: string[]) => string;
    pairs: (cells: string[]) => string;
    h2: (title: string, hint?: string) => string;
    kpi: (value: string, label: string, sub: string, width: string) => string;
    kpiRow: (kpis: {
        value: string;
        label: string;
        sub: string;
    }[], columns?: number) => string;
    list: (title: string, rows: [string, number][], hint?: string) => {
        inner: string;
        text: string;
    };
    bars: (values: number[], first: string, last: string, titles: string[], previous?: number[] | null, legend?: [string, string]) => string;
    bullets: (lines: string[]) => string;
    heat: (grid: number[][], days: string[]) => string;
    button: (href: string, label: string) => string;
    header: (eyebrow: string, title: string, subtitle: string, logo: string) => string;
    note: (text: string) => string;
    callout: (html: string) => string;
    paragraph: (text: string) => string;
    footer: (text: string) => string;
    page: (title: string, preheader: string, rows: string) => string;
    fill: typeof fill;
};
export type MailKit = ReturnType<typeof mailKit>;
export { fill };
