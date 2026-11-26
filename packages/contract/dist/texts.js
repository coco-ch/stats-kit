/*
 * Texts of the library (pages and report) in several languages, with English as the reference and the fallback. A site picks a
 * language with `locale` and overrides any text: `createTexts('fr', { stats: { title: 'Audience' } })`. Variables are written
 * between braces: "{n} visitors". Numbers, percentages, durations and dates are formatted with Intl in the locale of the texts.
 *
 * Adding a language: add `locales/<code>.ts` (same keys and variables as `locales/en.ts`) and register it in `locales/index.ts`;
 * the tests check both.
 */
import { en } from "./locales/en.js";
import { LOCALES } from "./locales/index.js";
export { LOCALES };
/** Default language. */
export const DEFAULT_LOCALE = 'en';
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Deep merge: texts replace; objects are completed. */
function merge(base, over) {
    if (!isRecord(over) || !isRecord(base))
        return (over === undefined ? base : over);
    const out = { ...base };
    for (const [k, v] of Object.entries(over))
        if (v !== undefined)
            out[k] = merge(base[k], v);
    return out;
}
/** Canonical BCP 47 tag, or `null` if the tag is not valid. */
function canonical(tag) {
    try {
        return Intl.getCanonicalLocales(tag)[0] ?? null;
    }
    catch {
        return null;
    }
}
/** Shipped language for a tag: exact code, then the language part ("fr-CH" → "fr"); `null` if none. */
export function matchLocale(tag) {
    const t = canonical(tag ?? '');
    if (!t)
        return null;
    const all = LOCALES;
    const lang = t.split('-')[0].toLowerCase();
    return (t in all ? t : lang in all ? lang : null);
}
/**
 * Texts of a language, completed by the site's overrides. A tag with a region ("fr-CH", "en-US") uses that language's texts and
 * keeps the tag for number and date formats. An unknown language falls back to English, or to a complete set given as `base`
 * (a language the library does not ship yet).
 */
export function createTexts(locale = DEFAULT_LOCALE, overrides, base) {
    const code = matchLocale(locale);
    let start = base ?? LOCALES[code ?? DEFAULT_LOCALE];
    const tag = canonical(locale);
    if (!base && code && tag && tag !== code && tag.includes('-'))
        start = { ...start, locale: tag };
    return merge(start, overrides);
}
/** Fills the "{name}" variables of a text; a missing variable is left as is. */
export function fill(template, vars = {}) {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
const pluralRules = new Map();
/** Picks the singular or plural form according to the plural rules of the locale (Intl), then fills "{n}". */
export function plural(texts, n, one, other) {
    let rules = pluralRules.get(texts.locale);
    if (!rules)
        pluralRules.set(texts.locale, (rules = new Intl.PluralRules(texts.locale)));
    return fill(rules.select(n) === 'one' ? one : other, { n: formatNumber(texts, n) });
}
/** Number formatted in the locale of the texts ("1,234", "1 234", "1.234"); "—" if it is not finite. */
export function formatNumber(texts, v, digits = 0, signed = false) {
    return Number.isFinite(v)
        ? v.toLocaleString(texts.locale, { maximumFractionDigits: digits, minimumFractionDigits: digits, ...(signed ? { signDisplay: 'exceptZero' } : {}) })
        : '—';
}
/** Label and value joined the way the language does it ("Visitors: 12", "Visiteurs : 12"). */
export const labelValue = (texts, label, value) => fill(texts.common.labelValue, { label, value });
/** @deprecated since 0.2.0, use `LOCALES`. */
export const LANGUES = LOCALES;
/**
 * @deprecated since 0.2.0, use `createTexts`. Kept for one release with its former default language (French); an unknown
 * language now falls back to English.
 */
export const textes = (langue = 'fr', overrides, base) => createTexts(langue, overrides, base);
