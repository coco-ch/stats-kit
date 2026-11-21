/*
 * Fonctions pures partagées par le serveur (rapport) et les composants (pages) : mises en forme, évolutions, créneaux, CSV.
 * Aucune dépendance au navigateur ni à Node.
 */
import { fill, formatNumber } from "./textes.js";
const NONE = { text: '', tone: '' };
/** Évolution relative ; `lowerIsBetter` pour une position (un chiffre plus petit est meilleur). */
export function delta(texts, now, before, lowerIsBetter = false) {
    if (before === null || before === undefined || !Number.isFinite(before))
        return NONE;
    if (before === 0)
        return now ? { text: texts.common.newItem, tone: lowerIsBetter ? 'down' : 'up' } : NONE;
    const p = Math.round(((now - before) / before) * 100);
    if (p === 0)
        return { text: '= 0 %', tone: 'flat' };
    const good = lowerIsBetter ? p < 0 : p > 0;
    return { text: `${p > 0 ? '▲ +' : '▼ '}${formatNumber(texts, p)} %`, tone: good ? 'up' : 'down' };
}
/** Écart absolu (positions, points de pourcentage). */
export function gap(texts, now, before, lowerIsBetter, digits = 1, unit = '') {
    if (before === null || before === undefined || !Number.isFinite(before))
        return NONE;
    const d = Math.round((now - before) * 10 ** digits) / 10 ** digits;
    if (d === 0)
        return { text: `= 0${unit}`, tone: 'flat' };
    const good = lowerIsBetter ? d < 0 : d > 0;
    return { text: `${d > 0 ? '▲ +' : '▼ '}${formatNumber(texts, d, digits)}${unit}`, tone: good ? 'up' : 'down' };
}
/** Évolution en pourcentage entier, ou `null` sans base de comparaison (rapport). */
export const percentChange = (now, before) => before ? Math.round(((now - before) / before) * 100) : null;
/** Taux (0 à 1) en pourcentage : « 12,5 % ». */
export const formatPercent = (texts, v, digits = 1) => Number.isFinite(v) ? `${formatNumber(texts, v * 100, digits)} %` : '—';
/** Durée en secondes : « 2 min 05 s », « 42 s », « — » si nulle. */
export function formatDuration(sec) {
    if (!Number.isFinite(sec) || sec <= 0)
        return '—';
    const s = Math.round(sec);
    return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}
/** Courbe compacte (chemin SVG d'une boîte w × h) ; vide s'il y a moins de deux points ou aucune variation. */
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
/** Pas de graduation rond (1, 2 ou 5 × 10ⁿ) pour `parts` intervalles au plus. */
export function niceStep(max, parts = 4) {
    const raw = Math.max(1, max / parts);
    const p = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
}
/** Créneau « AAAA-MM-JJ » ou « AAAA-MM-JJTHH » → date UTC qui porte ces chiffres (pour l'afficher sans décalage de fuseau). */
export function slotDate(slot) {
    const [y, m, d] = [slot.slice(0, 4), slot.slice(5, 7), slot.slice(8, 10)].map(Number);
    const h = slot.length >= 13 ? Number(slot.slice(11, 13)) : 0;
    return new Date(Date.UTC(y, m - 1, d, h));
}
/** Jour de la semaine d'un créneau, lundi = 0. */
export const weekdayOf = (slot) => (slotDate(slot).getUTCDay() + 6) % 7;
/** Libellé d'un créneau : « 14 h » (heure), « 16 nov. » (court) ou « lun. 16 nov. » (long). */
export function slotLabel(texts, slot, unit, long = false) {
    const d = slotDate(slot);
    if (unit === 'hour')
        return texts.locale.startsWith('fr') ? `${d.getUTCHours()} h` : `${String(d.getUTCHours()).padStart(2, '0')}:00`;
    return d.toLocaleDateString(texts.locale, long ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
/** Jour « AAAA-MM-JJ » en toutes lettres : « lundi 16 novembre ». */
export const longDay = (texts, ymd) => slotDate(ymd).toLocaleDateString(texts.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
/** Jour « AAAA-MM-JJ » ou instant ISO, en court : « 16 nov. 2026 » ; l'instant est lu dans `timeZone`. */
export function shortDate(texts, value, timeZone = 'UTC', withYear = false) {
    const isDay = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const d = isDay ? slotDate(value) : new Date(value);
    if (Number.isNaN(d.getTime()))
        return value;
    return d.toLocaleDateString(texts.locale, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: isDay ? 'UTC' : timeZone });
}
/** Meilleur créneau d'une carte de chaleur 7 × 24, ou `null` si elle est vide. */
export function bestSlot(grid) {
    let best = { day: 0, hour: 0, value: 0 };
    grid?.forEach((row, day) => row.forEach((value, hour) => { if (value > best.value)
        best = { day, hour, value }; }));
    return best.value ? best : null;
}
/** Nom d'un pays (code ISO alpha-2 ou alpha-3) dans la langue des textes, avec repli sur le code. */
export function countryName(texts, code) {
    if (!code)
        return texts.common.notSpecified;
    const cc = code.length === 3 ? (ALPHA3[code.toUpperCase()] ?? code.toUpperCase()) : code.toUpperCase();
    return displayName(texts, 'region', cc);
}
/** Nom d'une langue (« fr » → « français »), avec repli sur le code. */
export const languageName = (texts, code) => (code ? displayName(texts, 'language', code) : texts.common.notSpecified);
function displayName(texts, type, code) {
    try {
        return new Intl.DisplayNames([texts.locale], { type }).of(code) ?? code;
    }
    catch {
        return code; // code que Intl ne reconnaît pas
    }
}
/** Région « FR-PAC » → « PAC (France) ». */
export function regionName(texts, code) {
    const [country, sub] = code.split('-');
    return sub ? `${sub} (${countryName(texts, country)})` : countryName(texts, code);
}
/** Drapeau (emoji) d'un code pays alpha-2 ; globe sinon. */
export const flag = (code) => code && /^[A-Za-z]{2}$/.test(code) ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐';
/** Majuscule initiale (navigateurs et systèmes arrivent en minuscules). */
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Libellé d'un appareil Umami. */
export const deviceName = (texts, code) => texts.devices[code] ?? capitalize(code);
const BROWSERS = {
    chrome: 'Chrome', crios: 'Chrome (iOS)', ios: 'Safari (iOS)', 'ios-webview': 'iOS (WebView)', safari: 'Safari', firefox: 'Firefox', fxios: 'Firefox (iOS)',
    'edge-chromium': 'Edge', edge: 'Edge', 'edge-ios': 'Edge (iOS)', samsung: 'Samsung Internet', android: 'Android', 'chromium-webview': 'Android (WebView)',
    opera: 'Opera', yandexbrowser: 'Yandex', facebook: 'Facebook', instagram: 'Instagram', silk: 'Silk', miui: 'MIUI',
};
/** Nom d'un navigateur tel qu'Umami le code (« edge-chromium » → « Edge »). */
export const browserName = (code) => BROWSERS[code] ?? capitalize(code);
/** Libellé d'un canal d'acquisition Umami. */
export const channelName = (texts, code) => texts.channels[code] ?? code;
/** Texte de la période : « du 1 nov. au 30 nov. (30 jours) » ou « 24 dernières heures ». */
export function rangeText(texts, range) {
    if (range.days <= 1)
        return texts.periods.last24h;
    const last = new Date(Date.parse(range.to) - 1).toISOString();
    return fill(texts.periods.range, { from: shortDate(texts, range.from, range.timeZone), to: shortDate(texts, last, range.timeZone), days: range.days });
}
/** CSV (séparateur « ; », guillemets, BOM pour Excel). */
export function toCsv(rows) {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}
/** Nom de fichier sûr à partir d'un titre. */
export const fileName = (title) => title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';
/** Codes alpha-3 renvoyés par la Search Console → alpha-2 (pays les plus fréquents ; les autres gardent leur code). */
const ALPHA3 = {
    FRA: 'FR', CHE: 'CH', BEL: 'BE', LUX: 'LU', MCO: 'MC', CAN: 'CA', USA: 'US', GBR: 'GB', DEU: 'DE', ESP: 'ES', ITA: 'IT', PRT: 'PT',
    NLD: 'NL', IRL: 'IE', AUT: 'AT', SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', POL: 'PL', ROU: 'RO', GRC: 'GR', TUR: 'TR', RUS: 'RU',
    UKR: 'UA', CHN: 'CN', JPN: 'JP', KOR: 'KR', IND: 'IN', BRA: 'BR', MEX: 'MX', ARG: 'AR', AUS: 'AU', NZL: 'NZ', MAR: 'MA', DZA: 'DZ',
    TUN: 'TN', EGY: 'EG', ISR: 'IL', SEN: 'SN', CIV: 'CI', REU: 'RE', NCL: 'NC', CZE: 'CZ', HUN: 'HU', BGR: 'BG', HRV: 'HR', SVN: 'SI',
    SVK: 'SK', SRB: 'RS', ZAF: 'ZA', NGA: 'NG', CMR: 'CM', VNM: 'VN', THA: 'TH', IDN: 'ID', PHL: 'PH', SGP: 'SG', ARE: 'AE', SAU: 'SA',
};
