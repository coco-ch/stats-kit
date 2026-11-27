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
    map?: {
        background?: string;
        land?: string;
        border?: string;
        low?: string;
        high?: string;
    };
    /** Header logo: PNG attached to the message (`png`) or online image (`url`). */
    logo?: {
        png?: Uint8Array;
        url?: string;
        width?: number;
        height?: number;
        alt?: string;
    };
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
export type Palette = Required<Omit<ReportTheme, 'logo' | 'map' | 'dark'>> & {
    accentDeep: string;
    logo: ReportTheme['logo'] | null;
    map: Required<NonNullable<ReportTheme['map']>>;
    dark: DarkColors;
};
export declare function palette(t: ReportTheme): Palette;
/** "#rrggbb" → [r, g, b]. */
export declare const rgb: (hex: string) => [number, number, number];
