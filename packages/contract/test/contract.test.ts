import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CENTROIDES, CENTROIDS, CONTRACT_VERSION, DEFAULT_LOCALE, LANGUES, LOCALES, bestSlot, browserName, byKey, cannibalization, capitalize, channelName, countryName,
  createTexts, csvSeparator, delta, deviceName, featurePath, fileName, fill, flag, formatDuration, formatNumber, formatPercent, gap, hourName, intensity, isBrand,
  labelValue, languageName, lastDays, longDay, lostPages, lowCtrPages, matchLocale, mixHex, movers, newQueries, niceStep, normalize, pathOf, percentChange,
  plural, polygonsOf, potential, project, rangeText, regionName, shortDate, shortDateTime, slotDate, slotLabel, sparkPath, sumDays, textes, toCsv, weekdayName,
  weekdayOf, type SearchRow, type Texts,
} from 'stats-kit/contract';

const en = createTexts('en');
const fr = createTexts('fr');
const de = createTexts('de');
const row = (key: string, impressions: number, clicks = 0, position = 5): SearchRow => ({ key, impressions, clicks, ctr: impressions ? clicks / impressions : 0, position });
/** Normalises the spaces Intl puts in numbers and units (no-break, narrow no-break). */
const sp = (s: string) => s.replace(/[  ]/g, ' ');

/** Every leaf of a text tree, as "path" → value. */
const leaves = (o: object, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)] as [string, string]]));
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('locales', () => {
  const reference = leaves(LOCALES.en);
  for (const [code, texts] of Object.entries(LOCALES) as [string, Texts][]) {
    it(`${code}: exactly the same keys as English, the same variables in each text, nothing empty`, () => {
      const mine = leaves(texts);
      expect(mine.map(([k]) => k)).toEqual(reference.map(([k]) => k));
      for (const [i, [key, value]] of mine.entries()) {
        expect.soft(vars(value), `${code} ${key}`).toEqual(vars(reference[i][1]));
        if (reference[i][1]) expect.soft(value.trim(), `${code} ${key}`).not.toBe('');
      }
      expect(Intl.getCanonicalLocales(texts.locale)[0].split('-')[0]).toBe(code);
    });
  }
  it('every file of the locales folder is registered, and only those', () => {
    const files = readdirSync(new URL('../src/locales/', import.meta.url)).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
    expect(Object.keys(LOCALES).sort()).toEqual(files.sort());
    expect(Object.keys(LOCALES)).toEqual(expect.arrayContaining(['en', 'fr', 'de', 'es', 'it', 'pt', 'nl']));
  });
  it('a translation differs from English (no forgotten copy)', () => {
    for (const [code, texts] of Object.entries(LOCALES)) if (code !== 'en') expect(texts.stats.lead, code).not.toBe(en.stats.lead);
  });
});

describe('texts', () => {
  it('picks a language, a regional tag, or falls back to English', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(createTexts().stats.title).toBe('Statistics');
    expect(createTexts('de').stats.title).toBe(LOCALES.de.stats.title);
    expect(createTexts('fr-CH')).toMatchObject({ locale: 'fr-CH', stats: { title: 'Statistiques' } });
    expect(createTexts('en-US').locale).toBe('en-US');
    expect(createTexts('PT').locale).toBe(LOCALES.pt.locale);
    expect(createTexts('sv').locale).toBe('en-GB');
    expect(createTexts('not a tag!').stats.title).toBe('Statistics');
    expect(matchLocale('nl-BE')).toBe('nl');
    expect(matchLocale('xx')).toBeNull();
    expect(matchLocale(undefined)).toBeNull();
  });
  it('completes a language with the site overrides, without touching the other texts', () => {
    const t = createTexts('fr', { stats: { title: 'Audience' }, devices: { robot: 'Robot' } });
    expect(t.stats.title).toBe('Audience');
    expect(t.stats.lead).toBe(fr.stats.lead);
    expect(t.devices['mobile']).toBe('Mobile');
    expect(createTexts('sv', { common: { retry: 'Försök igen' } }, en).common.retry).toBe('Försök igen');
    expect(createTexts('fr-CH', undefined, en).locale).toBe('en-GB'); // a complete set given as base is kept as is
    expect(createTexts(undefined, { stats: undefined }).stats.title).toBe('Statistics');
  });
  it('deprecated aliases still work for one release', () => {
    expect(textes().stats.title).toBe('Statistiques');
    expect(textes('en').stats.title).toBe('Statistics');
    expect(LANGUES).toBe(LOCALES);
    expect(CENTROIDES).toBe(CENTROIDS);
    expect(CONTRACT_VERSION).toBe(1);
    const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { exports: Record<string, unknown> };
    expect(pkg.exports['./contrat']).toEqual(pkg.exports['./contract']);
    expect(pkg.exports['./serveur']).toEqual(pkg.exports['./server']);
    expect(pkg.exports['./contrat/schema.json']).toBe(pkg.exports['./contract/schema.json']);
    expect(pkg.exports['./serveur/monde.json']).toBe(pkg.exports['./server/world.json']);
  });
  it('fills variables and picks plural forms with the plural rules of the locale', () => {
    expect(fill('{n} of {total} ({x})', { n: 3, total: 9 })).toBe('3 of 9 ({x})');
    expect(fill('nothing')).toBe('nothing');
    expect(plural(fr, 1, '{n} visiteur', '{n} visiteurs')).toBe('1 visiteur');
    expect(plural(fr, 0, '{n} visiteur', '{n} visiteurs')).toBe('0 visiteur');
    expect(sp(plural(fr, 1234, '{n} visiteur', '{n} visiteurs'))).toBe('1 234 visiteurs');
    expect(plural(en, 0, '{n} visitor', '{n} visitors')).toBe('0 visitors');
    expect(plural(en, 1, '{n} visitor', '{n} visitors')).toBe('1 visitor');
    expect(plural(de, 1, '{n} Besucher', '{n} Besucher')).toBe('1 Besucher');
    expect(labelValue(en, 'Visitors', 12)).toBe('Visitors: 12');
    expect(labelValue(fr, 'Visiteurs', 12)).toBe('Visiteurs : 12');
  });
});

describe('formats (Intl, by locale)', () => {
  it('numbers, percentages, durations', () => {
    expect(formatNumber(en, 1234.5, 1)).toBe('1,234.5');
    expect(formatNumber(de, 1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(en, 3, 0, true)).toBe('+3');
    expect(formatNumber(fr, Number.NaN)).toBe('—');
    expect(formatPercent(en, 0.125)).toBe('12.5%');
    expect(sp(formatPercent(fr, 0.125))).toBe('12,5 %');
    expect(formatPercent(en, 0.2, 0, true)).toBe('+20%');
    expect(formatPercent(fr, Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatDuration(en, 0)).toBe('—');
    expect(formatDuration(en, Number.NaN)).toBe('—');
    expect(sp(formatDuration(en, 42.4))).toMatch(/^42 secs?$/);
    expect(sp(formatDuration(en, 125))).toMatch(/^2 mins? 5 secs?$/);
    expect(sp(formatDuration(fr, 125))).toBe('2 min 5 s');
  });
  it('relative and absolute changes', () => {
    expect(delta(fr, 10, null)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 10, undefined)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 10, Number.NaN)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 0, 0)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 5, 0)).toEqual({ text: 'nouveau', tone: 'up' });
    expect(delta(en, 5, 0, true)).toEqual({ text: 'new', tone: 'down' });
    expect(delta(en, 10, 10)).toEqual({ text: '= 0%', tone: 'flat' });
    expect(delta(en, 12, 10)).toEqual({ text: '▲ +20%', tone: 'up' });
    expect(sp(delta(fr, 12, 10).text)).toBe('▲ +20 %');
    expect(delta(en, 8, 10)).toEqual({ text: '▼ -20%', tone: 'down' });
    expect(delta(en, 8, 10, true).tone).toBe('up');
    expect(gap(fr, 3, null, true)).toEqual({ text: '', tone: '' });
    expect(gap(en, 3, 3, true)).toEqual({ text: '= 0', tone: 'flat' });
    expect(gap(en, 2.5, 4, true).tone).toBe('up');
    expect(gap(fr, 5, 4, true, 1, 'points')).toEqual({ text: '▲ +1,0 pt', tone: 'down' });
    expect(gap(en, 4, 4, true, 1, 'points').text).toBe('= 0 pt');
    expect(sp(gap(en, 50, 40, false, 0, 'seconds').text)).toMatch(/^▲ \+10 secs?$/);
    expect(gap(en, 5, 4, false, 0).tone).toBe('up');
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(12, 0)).toBeNull();
    expect(percentChange(12, null)).toBeNull();
  });
  it('lines and grid steps', () => {
    expect(sparkPath([1])).toBe('');
    expect(sparkPath([2, 2, 2])).toBe('');
    expect(sparkPath([0, 10])).toBe('M0.0 26.0 L100.0 2.0');
    expect(niceStep(0)).toBe(1);
    expect(niceStep(73)).toBe(20);
    expect(niceStep(380)).toBe(100);
    expect(niceStep(900)).toBe(500);
  });
  it('slots, dates, weekdays and hours', () => {
    expect(slotDate('2026-11-16T14').toISOString()).toBe('2026-11-16T14:00:00.000Z');
    expect(weekdayOf('2026-11-16')).toBe(0);
    expect(weekdayOf('2026-11-22')).toBe(6);
    expect(weekdayName(en, 0)).toBe('Monday');
    expect(weekdayName(fr, 6)).toBe('dimanche');
    expect(weekdayName(de, 0, 'short')).toMatch(/^Mo/);
    expect(hourName(en, 9)).toBe('09:00');
    expect(hourName(createTexts('en-US'), 21)).toMatch(/^09:00\sPM$/);
    expect(slotLabel(fr, '2026-11-16T09', 'hour')).toBe('09:00');
    expect(slotLabel(fr, '2026-11-16', 'day')).toMatch(/16 nov/);
    expect(slotLabel(fr, '2026-11-16', 'day', true)).toMatch(/lun/);
    expect(longDay(fr, '2026-11-16')).toBe('lundi 16 novembre');
    expect(longDay(en, '2026-11-16')).toBe('Monday 16 November');
    expect(shortDate(fr, '2026-11-16')).toMatch(/16 nov/);
    expect(shortDate(fr, '2026-11-16T23:30:00Z', 'Europe/Paris', true)).toMatch(/17 nov.* 2026/);
    expect(shortDate(fr, 'n’importe quoi')).toBe('n’importe quoi');
    expect(shortDateTime(en, '2026-11-16T08:05:00Z', 'Europe/Paris')).toMatch(/16 Nov.*09:05/);
    expect(rangeText(fr, { from: '2026-11-15T10:00:00Z', to: '2026-11-16T10:00:00Z', days: 1, timeZone: 'UTC' })).toBe('24 dernières heures');
    expect(rangeText(fr, { from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z', days: 7, timeZone: 'UTC' })).toMatch(/^du 1 nov\. au 7 nov\. \(7 jours\)$/);
    expect(rangeText(en, { from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z', days: 7, timeZone: 'UTC' })).toBe('1 Nov to 7 Nov (7 days)');
  });
  it('busiest slot of a heatmap', () => {
    expect(bestSlot(null)).toBeNull();
    expect(bestSlot([[0, 0], [0, 0]])).toBeNull();
    expect(bestSlot([[0, 1], [5, 2]])).toEqual({ day: 1, hour: 0, value: 5 });
  });
  it('names of countries, languages, regions, devices, browsers, channels in the language', () => {
    expect(countryName(fr, 'ch')).toBe('Suisse');
    expect(countryName(de, 'ch')).toBe('Schweiz');
    expect(countryName(en, 'fra')).toBe('France');
    expect(countryName(fr, 'zzz')).toBe('ZZZ');
    expect(countryName(en, '')).toBe('Not specified');
    expect(countryName(fr, '!!')).toBe('!!');
    expect(languageName(fr, 'de')).toBe('allemand');
    expect(languageName(en, 'de')).toBe('German');
    expect(languageName(fr, '')).toBe('Non précisé');
    expect(regionName(fr, 'FR-PAC')).toBe('PAC (France)');
    expect(regionName(fr, 'BE')).toBe('Belgique');
    expect(flag('fr')).toBe('🇫🇷');
    expect(flag(null)).toBe('🌐');
    expect(capitalize('')).toBe('');
    expect(deviceName(fr, 'desktop')).toBe('Ordinateur');
    expect(deviceName(en, 'robot')).toBe('Robot');
    expect(browserName('edge-chromium')).toBe('Edge');
    expect(browserName('kiwi')).toBe('Kiwi');
    expect(channelName(fr, 'organicSearch')).toBe('Moteurs de recherche');
    expect(channelName(en, 'other')).toBe('other');
  });
  it('CSV with the separator of the locale, file names', () => {
    expect(toCsv([['a', 'b"c'], [1, null, undefined]])).toBe('﻿"a";"b""c"\r\n"1";"";""');
    expect(toCsv([['a', 'b']], ',')).toBe('﻿"a","b"');
    expect([csvSeparator(en), csvSeparator(fr), csvSeparator(de)]).toEqual([',', ';', ';']);
    expect(fileName('Pages d’entrée (été)')).toBe('pages-d-entree-ete');
    expect(fileName('!!!')).toBe('export');
  });
});

describe('Search Console analyses', () => {
  const now = [row('example workshop', 400, 120, 1.2), row('oak table', 300, 3, 7), row('shelf', 50, 1, 25), row('fresh', 30, 0, 9), row('rare', 5, 0, 8), row('steady', 40, 2, 3)];
  const before = [row('example workshop', 380, 110, 1.3), row('oak table', 200, 2, 9), row('shelf', 90, 2, 22), row('gone', 60, 4, 6), row('steady', 40, 2, 3)];
  it('brand', () => {
    expect(normalize('Ébéniste')).toBe('ebeniste');
    expect(isBrand('EXAMPLE workshop reviews', ['example'])).toBe(true);
    expect(isBrand('table', ['example', ' '])).toBe(false);
  });
  it('potential, rising, falling, new', () => {
    expect(potential(now).map((q) => q.key)).toEqual(['oak table', 'fresh']);
    expect(potential([row('x', 100, 50, 5)])).toEqual([]);
    expect(movers(now, before, 'up').map((m) => [m.key, m.diff])).toEqual([['oak table', 100], ['example workshop', 20]]);
    expect(movers(now, before, 'down').map((m) => [m.key, m.diff])).toEqual([['gone', -60], ['shelf', -40]]);
    expect(newQueries(now, before).map((q) => q.key)).toEqual(['fresh', 'rare']);
  });
  it('rarely clicked pages, lost pages, cannibalisation', () => {
    const pages = [row('/a', 500, 1), row('/b', 10, 0), row('/c', 100, 10), row('/d', 900, 2)];
    expect(lowCtrPages(pages).map((p) => p.key)).toEqual(['/d', '/a']);
    expect(lostPages([row('/a', 50, 0)], [row('/a', 60, 3), row('/z', 10, 1), row('/y', 10, 0)]).map((p) => [p.key, p.before, p.impressions])).toEqual([['/a', 3, 50], ['/z', 1, 0]]);
    const qp = [{ query: 'q', page: '/a', clicks: 1, impressions: 10, ctr: 0.1, position: 2 }, { query: 'q', page: '/b', clicks: 0, impressions: 5, ctr: 0, position: 9 }, { query: 'r', page: '/a', clicks: 0, impressions: 3, ctr: 0, position: 4 }, { query: 's', page: '/a', clicks: 0, impressions: 0, ctr: 0, position: 0 }, { query: 's', page: '/c', clicks: 0, impressions: 2, ctr: 0, position: 0 }, { query: 't', page: '/x', clicks: 0, impressions: 30, ctr: 0, position: 0 }, { query: 't', page: '/y', clicks: 2, impressions: 30, ctr: 0, position: 0 }];
    expect(cannibalization(qp)).toEqual([{ key: 't', pages: 2, impressions: 60, clicks: 2, urls: ['/x', '/y'] }, { key: 'q', pages: 2, impressions: 15, clicks: 1, urls: ['/a', '/b'] }]);
    expect(byKey(pages).get('/b')?.impressions).toBe(10);
    expect(pathOf('https://example.test/fr/contact?x=1')).toBe('/fr/contact?x=1');
    expect(pathOf('not an address')).toBe('not an address');
  });
});

describe('YouTube analyses', () => {
  const day = (date: string, views: number) => ({ date, views, minutes: views * 2, gained: 1, lost: 0 });
  it('sum and periods', () => {
    expect(sumDays([])).toEqual({ views: 0, minutes: 0, gained: 0, lost: 0, averageViewDuration: 0 });
    expect(sumDays([day('2026-11-01', 10), day('2026-11-02', 20)])).toEqual({ views: 30, minutes: 60, gained: 2, lost: 0, averageViewDuration: 120 });
    const p = lastDays([day('a', 1), day('b', 2), day('c', 3), day('d', 4)], 2);
    expect([p.start, p.end, p.totals.views, p.previous.views]).toEqual(['c', 'd', 7, 3]);
    expect(lastDays([], 7).start).toBe('');
  });
});

describe('map', () => {
  const square = { properties: { iso2: 'XX' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] } };
  it('projection, paths, colours, intensity', () => {
    expect(project(-180, 84, 1000)).toEqual([0, 0]);
    expect(project(180, -58, 360)[1]).toBeCloseTo(142);
    expect(polygonsOf(square)).toHaveLength(1);
    expect(polygonsOf({ properties: { iso2: 'YY' }, geometry: { type: 'MultiPolygon', coordinates: [square.geometry.coordinates, square.geometry.coordinates] } })).toHaveLength(2);
    expect(featurePath(square, 360)).toMatch(/^M180\.0 84\.0L190\.0 84\.0.*Z$/);
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(intensity(0, 10)).toBe(0);
    expect(intensity(1, 1)).toBe(1);
    expect(intensity(1, 10)).toBeCloseTo(0.15);
    expect(intensity(10, 10)).toBeCloseTo(1);
  });
});
