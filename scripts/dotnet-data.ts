// Data of the .NET server (packages/dotnet), generated from the TypeScript sources so that both servers say and format the
// same things:
//   - Data/locales.json: the texts of every shipped language (packages/contract/src/locales);
//   - Data/intl.json: a snapshot of what Intl gives for the formats the report uses (numbers, percentages, units, plural
//     categories, dates, weekdays, hours, country and language names, ordering of keys). The .NET server rebuilds the same
//     strings from it, whatever the globalization data of the machine (containers often run in invariant mode);
//   - Data/centroids.json: country centroids of the map.
// `node --conditions=stats-kit-source scripts/dotnet-data.ts --check` fails if the committed files are out of date (CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { CENTROIDS, CURRENCIES, LOCALES, createTexts, formatMoney } from 'stats-kit/contract';

const dir = new URL('../packages/dotnet/src/StatsKit.Server/Data/', import.meta.url);
const world = JSON.parse(readFileSync(new URL('../packages/server/assets/world-110m.json', import.meta.url), 'utf8')) as { features: { properties: { iso2: string } }[] };

/** Regional tags whose formats are snapshotted too (names follow the language). */
const REGIONAL = ['en-US', 'en-CA', 'en-AU', 'en-IE', 'en-NZ', 'fr-CH', 'fr-BE', 'fr-CA', 'fr-LU', 'de-CH', 'de-AT', 'de-LU', 'it-CH', 'pt-BR', 'es-MX', 'es-US', 'es-AR', 'nl-BE', 'zh-TW', 'zh-HK', 'ru-UA'];
/** ISO 639-1 language codes. */
const LANGS = ('aa ab af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu').split(' ');
/** Language tags with a script, frequent in browsers. */
const SCRIPTS = ['zh-Hans', 'zh-Hant', 'zh-Hans-CN', 'zh-Hant-TW', 'zh-Hant-HK', 'sr-Latn', 'sr-Cyrl', 'uz-Latn', 'az-Latn', 'bs-Latn', 'pa-Guru'];

const regions = [...new Set([...world.features.map((f) => f.properties.iso2), ...Object.keys(CENTROIDS)])].filter((c) => /^[A-Z]{2}$/.test(c)).sort();
const allRegions: string[] = [];
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) allRegions.push(String.fromCharCode(a, b));

const defaults = Object.entries(LOCALES).map(([code, t]) => ({ code, tag: t.locale }));
const tags = [...defaults.map((d) => d.tag), ...REGIONAL];

/** Template of a formatted string: the number (formatted alone) replaced by "{n}". */
function template(full: string, number: string): string {
  const i = full.indexOf(number);
  if (i < 0) throw new Error(`"${number}" not found in "${full}"`);
  return full.slice(0, i) + '{n}' + full.slice(i + number.length);
}

function numberData(tag: string) {
  const parts = new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).formatToParts(1234567.5);
  const group = parts.find((p) => p.type === 'group')?.value ?? '';
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const minGroup = (1234).toLocaleString(tag).includes(group) ? 1 : 2;
  const plain = (n: number) => n.toLocaleString(tag);
  const signed = (n: number) => n.toLocaleString(tag, { signDisplay: 'exceptZero' });
  const pct = (n: number, s = false) => n.toLocaleString(tag, { style: 'percent', maximumFractionDigits: 0, ...(s ? { signDisplay: 'exceptZero' as const } : {}) });
  return {
    group, decimal, minGroup,
    number: { pos: template(plain(5), '5'), plus: template(signed(5), '5'), neg: template(plain(-5), '5') },
    percent: { pos: template(pct(0.5), '50'), plus: template(pct(0.5, true), '50'), neg: template(pct(-0.5), '50') },
  };
}

/**
 * Amounts (formatMoney): for each currency written with its symbol, the separators, the grouping, the number of decimals and
 * the templates of a positive and a negative amount; checked against Intl on sample amounts.
 */
function moneyData(tag: string) {
  const texts = createTexts(tag);
  const out: Record<string, { group: string; decimal: string; minGroup: number; digits: number; pos: string; neg: string }> = {};
  for (const code of CURRENCIES) {
    const f = new Intl.NumberFormat(tag, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' });
    const parts = f.formatToParts(1234567.5);
    const group = parts.find((p) => p.type === 'group')?.value ?? '';
    const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
    const digits = f.resolvedOptions().maximumFractionDigits ?? 2;
    const tpl = (v: number) => f.formatToParts(v).map((p) => (p.type === 'integer' ? '{n}' : p.type === 'decimal' || p.type === 'fraction' ? '' : p.value)).join('');
    const d = { group, decimal, minGroup: f.formatToParts(1234).some((p) => p.type === 'group') ? 1 : 2, digits, pos: tpl(5), neg: tpl(-5) };
    for (const v of [0, 1, 5, 12.5, 30, 99.999, 1234, 1490, 12345.678, 1234567.891, -3.256, -1490, 0.004, 2.675]) {
      const rounded = Number((Math.abs(v) + 1e-12).toFixed(digits)) * Math.sign(v || 1);
      const frac = Number.isInteger(rounded) ? 0 : digits;
      const [int, dec = ''] = Math.abs(rounded).toFixed(frac).split('.');
      const grouped = group && int.length >= 4 && (d.minGroup === 1 || int.length >= 5) ? int.replace(/\B(?=(\d{3})+(?!\d))/g, group) : int;
      const built = (v < 0 ? d.neg : d.pos).replace('{n}', dec ? `${grouped}${decimal}${dec}` : grouped);
      if (built !== formatMoney(texts, v, code)) throw new Error(`${tag} ${code} ${v}: "${built}" differs from "${formatMoney(texts, v, code)}"`);
    }
    out[code] = d;
  }
  return out;
}

/** Plural category of the integers 0 to 199 (beyond: the category of 100 + n % 100), and of a million. */
function pluralData(tag: string) {
  const rules = new Intl.PluralRules(tag);
  const table = Array.from({ length: 200 }, (_, n) => rules.select(n));
  const pick = (n: number) => (n < 200 ? table[n] : n % 1_000_000 === 0 ? rules.select(1_000_000) : table[100 + (n % 100)]);
  for (let n = 0; n < 100_000; n++) if (pick(n) !== rules.select(n)) throw new Error(`plural rule of ${tag} not periodic at ${n}`);
  for (const n of [1_000_000, 2_000_000, 5_000_000]) if (pick(n) !== rules.select(n)) throw new Error(`plural rule of ${tag} at ${n}`);
  const examples = new Map<string, number>();
  for (const n of [...Array(200).keys(), 1_000_000]) if (!examples.has(rules.select(n))) examples.set(rules.select(n), n);
  const unit = (u: 'minute' | 'second') => Object.fromEntries([...examples].map(([cat, n]) => [cat, template(n.toLocaleString(tag, { style: 'unit', unit: u, unitDisplay: 'short' }), n.toLocaleString(tag))]));
  return { plural: table.join(','), pluralMillion: rules.select(1_000_000), units: { minute: unit('minute'), second: unit('second') } };
}

/** Date template from parts: day → {d}, year → {y}, weekday → {w}, the month written out. */
function dateTemplate(parts: Intl.DateTimeFormatPart[]): string {
  return parts.map((p) => (p.type === 'day' ? '{d}' : p.type === 'year' ? '{y}' : p.type === 'weekday' ? '{w}' : p.value)).join('');
}

function dateData(tag: string) {
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { ...o, timeZone: 'UTC' });
  const dm = fmt({ day: 'numeric', month: 'short' });
  const dmy = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
  const long = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
  const wdm = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
  const months = (f: Intl.DateTimeFormat) => Array.from({ length: 12 }, (_, m) => dateTemplate(f.formatToParts(new Date(Date.UTC(2026, m, 16)))));
  const weekdaysIn = (f: Intl.DateTimeFormat) => Array.from({ length: 7 }, (_, d) => f.formatToParts(new Date(Date.UTC(2026, 10, 16 + d))).find((p) => p.type === 'weekday')!.value);
  const dayOf = (t: Date) => dm.formatToParts(t).find((p) => p.type === 'day')!.value;
  const data = {
    dm: months(dm), dmy: months(dmy), long: { months: months(long), weekdays: weekdaysIn(long) }, dmShort: { months: months(wdm), weekdays: weekdaysIn(wdm) },
    weekdays: {
      long: Array.from({ length: 7 }, (_, d) => fmt({ weekday: 'long' }).format(new Date(Date.UTC(2026, 10, 16 + d)))),
      short: Array.from({ length: 7 }, (_, d) => fmt({ weekday: 'short' }).format(new Date(Date.UTC(2026, 10, 16 + d)))),
    },
    hours: Array.from({ length: 24 }, (_, h) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(Date.UTC(2026, 10, 16, h)))),
    // the day as Intl writes it (with or without a leading zero)
    day: Array.from({ length: 31 }, (_, i) => dayOf(new Date(Date.UTC(2026, 0, i + 1)))),
  };
  // checked for every day of two years
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 86_400_000) {
    const d = new Date(t), m = d.getUTCMonth(), day = data.day[d.getUTCDate() - 1], w = (d.getUTCDay() + 6) % 7;
    const check = (f: Intl.DateTimeFormat, tpl: string, weekdays?: string[]) => {
      const built = tpl.replace('{d}', day).replace('{y}', String(d.getUTCFullYear())).replace('{w}', weekdays?.[w] ?? '');
      if (built !== f.format(d)) throw new Error(`${tag}: "${built}" differs from "${f.format(d)}"`);
    };
    check(dm, data.dm[m]);
    check(dmy, data.dmy[m]);
    check(long, data.long.months[m], data.long.weekdays);
    check(wdm, data.dmShort.months[m], data.dmShort.weekdays);
  }
  return data;
}

function namesData(tag: string) {
  const region = new Intl.DisplayNames([tag], { type: 'region' });
  const language = new Intl.DisplayNames([tag], { type: 'language' });
  const regionNames: Record<string, string> = {};
  for (const c of allRegions) {
    try {
      const n = region.of(c);
      if (n && n !== c) regionNames[c] = n;
    } catch { /* not a region */ }
  }
  const languages: Record<string, string> = {};
  for (const l of [...LANGS, ...SCRIPTS]) {
    const n = language.of(l);
    if (n && n !== l) languages[l] = n;
  }
  // "French (Cameroon)": language and region names in the locale's pattern; dialect names ("British English") listed apart
  const pattern = language.of('fr-CM')!.replace(language.of('fr')!, '{0}').replace(region.of('CM')!, '{1}');
  const dialects: Record<string, string> = {};
  for (const l of LANGS) for (const r of regions) {
    const t = `${l}-${r}`;
    const n = language.of(t);
    const composed = pattern.replace('{0}', languages[l] ?? l).replace('{1}', regionNames[r] ?? r);
    if (n && n !== composed) dialects[t] = n;
  }
  return { regions: regionNames, languages, pattern, dialects };
}

/** Ordering of `localeCompare` (ICU root collation) for printable ASCII: characters in order, and their primary rank. */
function collation() {
  const chars = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
  const base = new Intl.Collator(undefined, { sensitivity: 'base' });
  chars.sort((a, b) => base.compare(a, b) || a.localeCompare(b));
  const ranks: number[] = [];
  let rank = 0;
  chars.forEach((c, i) => { if (i && base.compare(chars[i - 1], c) !== 0) rank++; ranks.push(rank); });
  return { order: chars.join(''), ranks: ranks.join(',') };
}

const check = process.argv.includes('--check');
const intl = {
  generatedWith: `Node ${process.versions.node}, ICU ${process.versions.icu}, CLDR ${process.versions.cldr}`,
  defaults: Object.fromEntries(defaults.map((d) => [d.code, d.tag])),
  tags: Object.fromEntries(tags.map((tag) => [tag, { ...numberData(tag), ...pluralData(tag), ...dateData(tag), money: moneyData(tag) }])),
  names: Object.fromEntries(defaults.map((d) => [d.code, namesData(d.tag)])),
  collation: collation(),
};
const centroids = Object.fromEntries(Object.entries(CENTROIDS).map(([k, v]) => [k, [...v]]));

const noStamp = (k: string, v: unknown) => (k === 'generatedWith' ? undefined : v);
let stale = false;
for (const [name, data] of [['locales.json', LOCALES], ['intl.json', intl], ['centroids.json', centroids]] as const) {
  const file = new URL(name, dir);
  if (check) {
    let current = '';
    try { current = JSON.stringify(JSON.parse(readFileSync(file, 'utf8')), noStamp); } catch { /* missing */ }
    if (current !== JSON.stringify(data, noStamp)) {
      console.error(`${name} is out of date: run "npm run dotnet:data".`);
      stale = true;
    }
  } else {
    writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
  }
}
if (stale) process.exit(1);
console.log(check ? '.NET data up to date.' : `.NET data written to ${decodeURIComponent(dir.pathname)}`);
