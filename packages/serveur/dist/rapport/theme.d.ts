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
    logo?: {
        png?: Uint8Array;
        url?: string;
        width?: number;
        height?: number;
        alt?: string;
    };
}
/** Thème complet, toutes teintes calculées. */
export type Palette = Required<Omit<ReportTheme, 'logo'>> & {
    accentDeep: string;
    logo: ReportTheme['logo'] | null;
};
export declare function palette(t: ReportTheme): Palette;
/** « #rrggbb » → [r, g, b]. */
export declare const rgb: (hex: string) => [number, number, number];
