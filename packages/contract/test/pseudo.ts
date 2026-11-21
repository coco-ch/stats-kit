/*
 * Pseudo-localisation for the tests: every text becomes "‡" and the Intl locale is Chinese, whose numbers, dates, weekdays,
 * units, country and language names contain no Latin letter. Data strings are scrubbed the same way (Latin letters → "ж"),
 * except the fields that must stay machine-readable (dates, codes). Rendering a component or the report with both, then finding
 * a Latin letter in the output, reveals a text written in the code instead of coming from the locale files.
 */
import { LOCALES, type Texts } from '../src/index.ts';

const mapStrings = (v: unknown, f: (s: string, key: string, parent: string) => string, key = '', parent = ''): unknown => {
  if (typeof v === 'string') return f(v, key, parent);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f, key, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, f, k, key)]));
  return v;
};

/** Texts where every text is "‡", formatted as Chinese. */
export const pseudoTexts = (): Texts => ({ ...(mapStrings(LOCALES.en, () => '‡') as Texts), locale: 'zh-CN' });

/** Fields kept as is: dates and enumerations the code needs to read. */
const KEEP = new Set(['version', 'status', 'unit', 'timeZone', 'from', 'to', 'previousFrom', 'previousTo', 'generatedAt', 'slots', 'lastAt', 'start', 'end',
  'previousStart', 'previousEnd', 'date', 'publishedAt', 'checkedAt', 'lastDownloaded', 'lastCrawl', 'createdAt', 'at', 'visibility', 'source', 'country', 'device']);
/** Rankings whose keys are codes turned into names by the locale (countries, languages, devices, channels). */
const CODES = new Set(['countries', 'previousCountries', 'languages', 'siteLanguages', 'devices', 'previousDevices', 'channels']);

/** Data with every Latin letter replaced, except the machine-readable fields. */
export function scrub<T>(data: T): T {
  return mapStrings(data, (s, key, parent) => (KEEP.has(key) || (key === 'key' && CODES.has(parent)) ? s : s.replace(/[A-Za-z]/g, 'ж'))) as T;
}

/** Latin words found in a text (empty when everything came from the locale). */
export const latin = (s: string): string[] => s.match(/[A-Za-z]+/g) ?? [];
