import { fill, type Texts } from 'stats-kit/contrat';
import type { Palette } from './theme.ts';
/** Largeur du message, en pixels. */
export declare const MAIL_WIDTH = 760;
/** Largeur utile d'une carte pleine largeur (marges et bordure déduites). */
export declare const CARD_INNER: number;
export declare const esc: (s: unknown) => string;
/** Texte échappé, retours à la ligne conservés. */
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
    bars: (values: number[], first: string, last: string, titles: string[]) => string;
    heat: (grid: number[][]) => string;
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
