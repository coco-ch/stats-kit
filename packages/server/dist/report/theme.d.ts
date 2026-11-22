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
    /** Header logo: PNG attached to the message (`png`) or online image (`url`). */
    logo?: {
        png?: Uint8Array;
        url?: string;
        width?: number;
        height?: number;
        alt?: string;
    };
}
/** Complete theme, all shades computed. */
export type Palette = Required<Omit<ReportTheme, 'logo'>> & {
    accentDeep: string;
    logo: ReportTheme['logo'] | null;
};
export declare function palette(t: ReportTheme): Palette;
/** "#rrggbb" → [r, g, b]. */
export declare const rgb: (hex: string) => [number, number, number];
