/*
 * Pure functions shared by the server (report) and the components (pages): formats, changes, slots, CSV. Numbers, percentages,
 * durations, dates, weekdays and hours come from Intl in the locale of the texts. No dependency on the browser or on Node.
 */
import { fill, formatNumber } from "./texts.js";
const NONE = { text: '', tone: '' };
/** Rate (0 to 1) as a percentage in the locale ("12.5%", "12,5 %"); `signed` adds "+" to a positive value. */
export const formatPercent = (texts, v, digits = 1, signed = false) => Number.isFinite(v)
    ? v.toLocaleString(texts.locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits, ...(signed ? { signDisplay: 'exceptZero' } : {}) })
    : '—';
/** Relative change; `lowerIsBetter` for a position (a smaller figure is better). */
export function delta(texts, now, before, lowerIsBetter = false) {
    if (before === null || before === undefined || !Number.isFinite(before))
        return NONE;
    if (before === 0)
        return now ? { text: texts.common.newItem, tone: lowerIsBetter ? 'down' : 'up' } : NONE;
    const p = Math.round(((now - before) / before) * 100);
    if (p === 0)
        return { text: `= ${formatPercent(texts, 0, 0)}`, tone: 'flat' };
    const good = lowerIsBetter ? p < 0 : p > 0;
    return { text: `${p > 0 ? '▲' : '▼'} ${formatPercent(texts, p / 100, 0, true)}`, tone: good ? 'up' : 'down' };
}
/** Number with its unit, in the locale. */
function withUnit(texts, n, digits, unit, signed) {
    if (unit === 'seconds')
        return n.toLocaleString(texts.locale, { style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: digits, ...(signed ? { signDisplay: 'exceptZero' } : {}) });
    const s = formatNumber(texts, n, digits, signed);
    return unit === 'points' ? fill(texts.common.points, { n: s }) : s;
}
/** Absolute change (positions, percentage points, seconds). */
export function gap(texts, now, before, lowerIsBetter, digits = 1, unit = null) {
    if (before === null || before === undefined || !Number.isFinite(before))
        return NONE;
    const d = Math.round((now - before) * 10 ** digits) / 10 ** digits;
    if (d === 0)
        return { text: `= ${withUnit(texts, 0, 0, unit, false)}`, tone: 'flat' };
    const good = lowerIsBetter ? d < 0 : d > 0;
    return { text: `${d > 0 ? '▲' : '▼'} ${withUnit(texts, d, digits, unit, true)}`, tone: good ? 'up' : 'down' };
}
/** Change as a whole percentage, or `null` without a basis for comparison (report). */
export const percentChange = (now, before) => before ? Math.round(((now - before) / before) * 100) : null;
/** Duration in seconds, in the locale: "2 min 5 s", "42 sec", "—" if zero. */
export function formatDuration(texts, sec) {
    if (!Number.isFinite(sec) || sec <= 0)
        return '—';
    const s = Math.round(sec);
    const unit = (n, u) => n.toLocaleString(texts.locale, { style: 'unit', unit: u, unitDisplay: 'short' });
    return s >= 60 ? `${unit(Math.floor(s / 60), 'minute')} ${unit(s % 60, 'second')}` : unit(s, 'second');
}
/** Compact line (SVG path in a w × h box); empty with fewer than two points or no variation. */
export function sparkPath(values, w = 100, h = 28) {
    if (values.length < 2)
        return '';
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (lo === hi)
        return '';
    return values
        .map((y, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - 2 - ((y - lo) / (hi - lo)) * (h - 4)).toFixed(1)}`)
        .join(' ');
}
/** Round grid step (1, 2 or 5 × 10ⁿ) for at most `parts` intervals. */
export function niceStep(max, parts = 4) {
    const raw = Math.max(1, max / parts);
    const p = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
}
/** Slot "YYYY-MM-DD" or "YYYY-MM-DDTHH" → UTC date carrying these figures (to display it without a time zone shift). */
export function slotDate(slot) {
    const [y, m, d] = [slot.slice(0, 4), slot.slice(5, 7), slot.slice(8, 10)].map(Number);
    const h = slot.length >= 13 ? Number(slot.slice(11, 13)) : 0;
    return new Date(Date.UTC(y, m - 1, d, h));
}
/** Weekday of a slot, Monday = 0. */
export const weekdayOf = (slot) => (slotDate(slot).getUTCDay() + 6) % 7;
/** Name of a weekday (Monday = 0) in the locale: "Monday" / "Mon". */
export const weekdayName = (texts, day, width = 'long') => new Date(Date.UTC(2026, 10, 16 + day)).toLocaleDateString(texts.locale, { weekday: width, timeZone: 'UTC' }); // 16 Nov 2026 is a Monday
/** Hour of the day (0 to 23) in the locale: "09:00", "9 AM"… */
export const hourName = (texts, hour) => new Date(Date.UTC(2026, 10, 16, hour)).toLocaleTimeString(texts.locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
/** Label of a slot: hour ("14:00"), short day ("16 Nov") or long day ("Mon 16 Nov"). */
export function slotLabel(texts, slot, unit, long = false) {
    const d = slotDate(slot);
    if (unit === 'hour')
        return hourName(texts, d.getUTCHours());
    return d.toLocaleDateString(texts.locale, long ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
/** Day "YYYY-MM-DD" in full: "Monday 16 November". */
export const longDay = (texts, ymd) => slotDate(ymd).toLocaleDateString(texts.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
/** Day "YYYY-MM-DD" or ISO instant, short: "16 Nov 2026"; the instant is read in `timeZone`. */
export function shortDate(texts, value, timeZone = 'UTC', withYear = false) {
    const isDay = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const d = isDay ? slotDate(value) : new Date(value);
    if (Number.isNaN(d.getTime()))
        return value;
    return d.toLocaleDateString(texts.locale, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: isDay ? 'UTC' : timeZone });
}
/** Instant with date and time, short, read in `timeZone`. */
export const shortDateTime = (texts, iso, timeZone = 'UTC') => new Date(iso).toLocaleString(texts.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone });
/** Busiest slot of a 7 × 24 heatmap, or `null` if it is empty. */
export function bestSlot(grid) {
    let best = { day: 0, hour: 0, value: 0 };
    grid?.forEach((row, day) => row.forEach((value, hour) => { if (value > best.value)
        best = { day, hour, value }; }));
    return best.value ? best : null;
}
/** Name of a country (ISO alpha-2 or alpha-3 code) in the language of the texts, falling back to the code. */
export function countryName(texts, code) {
    if (!code)
        return texts.common.notSpecified;
    const cc = code.length === 3 ? (ALPHA3[code.toUpperCase()] ?? code.toUpperCase()) : code.toUpperCase();
    return displayName(texts, 'region', cc);
}
/** Name of a language ("fr" → "French"), falling back to the code. */
export const languageName = (texts, code) => (code ? displayName(texts, 'language', code) : texts.common.notSpecified);
function displayName(texts, type, code) {
    try {
        return new Intl.DisplayNames([texts.locale], { type }).of(code) ?? code;
    }
    catch {
        return code; // a code Intl does not know
    }
}
/** Region "FR-PAC" → "PAC (France)". */
export function regionName(texts, code) {
    const [country, sub] = code.split('-');
    return sub ? `${sub} (${countryName(texts, country)})` : countryName(texts, code);
}
/** Flag (emoji) of an alpha-2 country code; a globe otherwise. */
export const flag = (code) => code && /^[A-Za-z]{2}$/.test(code) ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐';
/** Initial capital (browsers and systems arrive in lower case). */
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Label of an Umami device. */
export const deviceName = (texts, code) => texts.devices[code] ?? capitalize(code);
/** Browser names (brand names, identical in every language). */
const BROWSERS = {
    chrome: 'Chrome', crios: 'Chrome (iOS)', ios: 'Safari (iOS)', 'ios-webview': 'iOS (WebView)', safari: 'Safari', firefox: 'Firefox', fxios: 'Firefox (iOS)',
    'edge-chromium': 'Edge', edge: 'Edge', 'edge-ios': 'Edge (iOS)', samsung: 'Samsung Internet', android: 'Android', 'chromium-webview': 'Android (WebView)',
    opera: 'Opera', yandexbrowser: 'Yandex', facebook: 'Facebook', instagram: 'Instagram', silk: 'Silk', miui: 'MIUI',
};
/** Name of a browser as Umami codes it ("edge-chromium" → "Edge"). */
export const browserName = (code) => BROWSERS[code] ?? capitalize(code);
/** Label of an Umami acquisition channel. */
export const channelName = (texts, code) => texts.channels[code] ?? code;
/** Text of the period: "1 Nov to 30 Nov (30 days)" or "last 24 hours". */
export function rangeText(texts, range) {
    if (range.days <= 1)
        return texts.periods.last24h;
    const last = new Date(Date.parse(range.to) - 1).toISOString();
    return fill(texts.periods.range, { from: shortDate(texts, range.from, range.timeZone), to: shortDate(texts, last, range.timeZone), days: range.days });
}
/** CSV separator of the locale: ";" where the decimal separator is a comma (what Excel expects there), "," otherwise. */
export const csvSeparator = (texts) => ((1.5).toLocaleString(texts.locale).includes(',') ? ';' : ',');
/** CSV (quotes, BOM for Excel). */
export function toCsv(rows, separator = ';') {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return '﻿' + rows.map((r) => r.map(cell).join(separator)).join('\r\n');
}
/** Safe file name from a title. */
export const fileName = (title) => title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';
/** Alpha-3 codes returned by Search Console → alpha-2 (most frequent countries; the others keep their code). */
const ALPHA3 = {
    FRA: 'FR', CHE: 'CH', BEL: 'BE', LUX: 'LU', MCO: 'MC', CAN: 'CA', USA: 'US', GBR: 'GB', DEU: 'DE', ESP: 'ES', ITA: 'IT', PRT: 'PT',
    NLD: 'NL', IRL: 'IE', AUT: 'AT', SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', POL: 'PL', ROU: 'RO', GRC: 'GR', TUR: 'TR', RUS: 'RU',
    UKR: 'UA', CHN: 'CN', JPN: 'JP', KOR: 'KR', IND: 'IN', BRA: 'BR', MEX: 'MX', ARG: 'AR', AUS: 'AU', NZL: 'NZ', MAR: 'MA', DZA: 'DZ',
    TUN: 'TN', EGY: 'EG', ISR: 'IL', SEN: 'SN', CIV: 'CI', REU: 'RE', NCL: 'NC', CZE: 'CZ', HUN: 'HU', BGR: 'BG', HRV: 'HR', SVN: 'SI',
    SVK: 'SK', SRB: 'RS', ZAF: 'ZA', NGA: 'NG', CMR: 'CM', VNM: 'VN', THA: 'TH', IDN: 'ID', PHL: 'PH', SGP: 'SG', ARE: 'AE', SAU: 'SA',
};
