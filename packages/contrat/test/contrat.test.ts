import { describe, expect, it } from 'vitest';
import {
  CONTRACT_VERSION, LANGUES, bestSlot, browserName, byKey, cannibalization, capitalize, channelName, countryName, delta, deviceName, featurePath, fileName,
  fill, flag, formatDuration, formatNumber, formatPercent, gap, intensity, isBrand, languageName, lastDays, longDay, lostPages, lowCtrPages, mixHex,
  movers, newQueries, niceStep, normalize, pathOf, percentChange, plural, polygonsOf, potential, project, rangeText, regionName, shortDate, slotDate,
  slotLabel, sparkPath, sumDays, textes, toCsv, weekdayOf, type SearchRow,
} from 'stats-kit/contrat';

const fr = textes('fr');
const en = textes('en');
const row = (key: string, impressions: number, clicks = 0, position = 5): SearchRow => ({ key, impressions, clicks, ctr: impressions ? clicks / impressions : 0, position });

describe('textes', () => {
  it('fournit le français et l’anglais avec les mêmes clés', () => {
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map((x) => `${k}.${x}`) : [k]));
    const dynamic = /^(devices|searchDevices|channels|youtubeTraffic|youtube\.visibility)\./;
    expect(keys(LANGUES.en).filter((k) => !dynamic.test(k)).sort()).toEqual(keys(LANGUES.fr).filter((k) => !dynamic.test(k)).sort());
    expect(CONTRACT_VERSION).toBe(1);
  });
  it('complète une langue par les réglages du site, sans toucher aux autres textes', () => {
    const t = textes('fr', { stats: { title: 'Audience' }, weekdays: ['l', 'm', 'm', 'j', 'v', 's', 'd'] });
    expect(t.stats.title).toBe('Audience');
    expect(t.stats.lead).toBe(fr.stats.lead);
    expect(t.weekdays[0]).toBe('l');
    expect(textes('xx').locale).toBe('fr-FR');
    expect(textes('de', { common: { retry: 'Nochmal' } }, en).common.retry).toBe('Nochmal');
    expect(textes(undefined, { stats: undefined }).stats.title).toBe('Statistiques');
    expect(textes().locale).toBe('fr-FR');
  });
  it('remplit les variables et accorde au pluriel', () => {
    expect(fill('{n} sur {total} ({x})', { n: 3, total: 9 })).toBe('3 sur 9 ({x})');
    expect(fill('rien')).toBe('rien');
    expect(plural(fr, 1, '{n} visiteur', '{n} visiteurs')).toBe('1 visiteur');
    expect(plural(fr, 0, '{n} visiteur', '{n} visiteurs')).toBe('0 visiteur');
    expect(plural(fr, 1234, '{n} visiteur', '{n} visiteurs')).toMatch(/^1\s234 visiteurs$/);
    expect(plural(en, 0, '{n} visitor', '{n} visitors')).toBe('0 visitors');
    expect(plural(en, 1, '{n} visitor', '{n} visitors')).toBe('1 visitor');
  });
});

describe('mise en forme', () => {
  it('nombres, pourcentages, durées', () => {
    expect(formatNumber(en, 1234.5, 1)).toBe('1,234.5');
    expect(formatNumber(fr, Number.NaN)).toBe('—');
    expect(formatPercent(fr, 0.125)).toMatch(/^12,5\s%$/);
    expect(formatPercent(fr, Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(42.4)).toBe('42 s');
    expect(formatDuration(125)).toBe('2 min 05 s');
  });
  it('évolutions relatives et absolues', () => {
    expect(delta(fr, 10, null)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 10, undefined)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 10, Number.NaN)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 0, 0)).toEqual({ text: '', tone: '' });
    expect(delta(fr, 5, 0)).toEqual({ text: 'nouveau', tone: 'up' });
    expect(delta(fr, 5, 0, true).tone).toBe('down');
    expect(delta(fr, 10, 10)).toEqual({ text: '= 0 %', tone: 'flat' });
    expect(delta(fr, 12, 10)).toEqual({ text: '▲ +20 %', tone: 'up' });
    expect(delta(fr, 8, 10)).toEqual({ text: '▼ -20 %', tone: 'down' });
    expect(delta(fr, 8, 10, true).tone).toBe('up');
    expect(gap(fr, 3, null, true)).toEqual({ text: '', tone: '' });
    expect(gap(fr, 3, 3, true)).toEqual({ text: '= 0', tone: 'flat' });
    expect(gap(fr, 2.5, 4, true).tone).toBe('up');
    expect(gap(fr, 5, 4, true, 1, ' pt')).toEqual({ text: '▲ +1,0 pt', tone: 'down' });
    expect(gap(fr, 5, 4, false, 0).tone).toBe('up');
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(12, 0)).toBeNull();
    expect(percentChange(12, null)).toBeNull();
  });
  it('courbes et graduations', () => {
    expect(sparkPath([1])).toBe('');
    expect(sparkPath([2, 2, 2])).toBe('');
    expect(sparkPath([0, 10])).toBe('M0.0 26.0 L100.0 2.0');
    expect(niceStep(0)).toBe(1);
    expect(niceStep(73)).toBe(20);
    expect(niceStep(380)).toBe(100);
    expect(niceStep(900)).toBe(500);
  });
  it('créneaux et dates', () => {
    expect(slotDate('2026-11-16T14').toISOString()).toBe('2026-11-16T14:00:00.000Z');
    expect(weekdayOf('2026-11-16')).toBe(0);
    expect(weekdayOf('2026-11-22')).toBe(6);
    expect(slotLabel(fr, '2026-11-16T09', 'hour')).toBe('9 h');
    expect(slotLabel(en, '2026-11-16T09', 'hour')).toBe('09:00');
    expect(slotLabel(fr, '2026-11-16', 'day')).toMatch(/16 nov/);
    expect(slotLabel(fr, '2026-11-16', 'day', true)).toMatch(/lun/);
    expect(longDay(fr, '2026-11-16')).toBe('lundi 16 novembre');
    expect(shortDate(fr, '2026-11-16')).toMatch(/16 nov/);
    expect(shortDate(fr, '2026-11-16T23:30:00Z', 'Europe/Paris', true)).toMatch(/17 nov.* 2026/);
    expect(shortDate(fr, 'n’importe quoi')).toBe('n’importe quoi');
    expect(rangeText(fr, { from: '2026-11-15T10:00:00Z', to: '2026-11-16T10:00:00Z', days: 1, timeZone: 'UTC' })).toBe('24 dernières heures');
    expect(rangeText(fr, { from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z', days: 7, timeZone: 'UTC' })).toMatch(/^du 1 nov\. au 7 nov\. \(7 jours\)$/);
  });
  it('meilleur créneau d’une carte de chaleur', () => {
    expect(bestSlot(null)).toBeNull();
    expect(bestSlot([[0, 0], [0, 0]])).toBeNull();
    expect(bestSlot([[0, 1], [5, 2]])).toEqual({ day: 1, hour: 0, value: 5 });
  });
  it('noms de pays, langues, régions, appareils, navigateurs, canaux', () => {
    expect(countryName(fr, 'ch')).toBe('Suisse');
    expect(countryName(fr, 'fra')).toBe('France');
    expect(countryName(fr, 'zzz')).toBe('ZZZ');
    expect(countryName(fr, '')).toBe('Non précisé');
    expect(countryName(fr, '!!')).toBe('!!');
    expect(languageName(fr, 'de')).toBe('allemand');
    expect(languageName(fr, '')).toBe('Non précisé');
    expect(regionName(fr, 'FR-PAC')).toBe('PAC (France)');
    expect(regionName(fr, 'BE')).toBe('Belgique');
    expect(flag('fr')).toBe('🇫🇷');
    expect(flag(null)).toBe('🌐');
    expect(capitalize('')).toBe('');
    expect(deviceName(fr, 'mobile')).toBe('Mobile');
    expect(deviceName(fr, 'robot')).toBe('Robot');
    expect(browserName('edge-chromium')).toBe('Edge');
    expect(browserName('kiwi')).toBe('Kiwi');
    expect(channelName(fr, 'organicSearch')).toBe('Moteurs de recherche');
    expect(channelName(fr, 'autre')).toBe('autre');
  });
  it('CSV et noms de fichier', () => {
    expect(toCsv([['a', 'b"c'], [1, null, undefined]])).toBe('﻿"a";"b""c"\r\n"1";"";""');
    expect(fileName('Pages d’entrée (été)')).toBe('pages-d-entree-ete');
    expect(fileName('!!!')).toBe('export');
  });
});

describe('analyses Search Console', () => {
  const now = [row('atelier exemple', 400, 120, 1.2), row('table chene', 300, 3, 7), row('etagere', 50, 1, 25), row('nouvelle', 30, 0, 9), row('rare', 5, 0, 8), row('stable', 40, 2, 3)];
  const before = [row('atelier exemple', 380, 110, 1.3), row('table chene', 200, 2, 9), row('etagere', 90, 2, 22), row('disparue', 60, 4, 6), row('stable', 40, 2, 3)];
  it('marque', () => {
    expect(normalize('Ébéniste')).toBe('ebeniste');
    expect(isBrand('Atelier EXEMPLE avis', ['exemple'])).toBe(true);
    expect(isBrand('table', ['exemple', ' '])).toBe(false);
  });
  it('potentiel, hausses, baisses, nouveautés', () => {
    expect(potential(now).map((q) => q.key)).toEqual(['table chene', 'nouvelle']);
    expect(potential([row('x', 100, 50, 5)])).toEqual([]);
    expect(movers(now, before, 'up').map((m) => [m.key, m.diff])).toEqual([['table chene', 100], ['atelier exemple', 20]]);
    expect(movers(now, before, 'down').map((m) => [m.key, m.diff])).toEqual([['disparue', -60], ['etagere', -40]]);
    expect(newQueries(now, before).map((q) => q.key)).toEqual(['nouvelle', 'rare']);
  });
  it('pages peu cliquées, pages perdues, cannibalisation', () => {
    const pages = [row('/a', 500, 1), row('/b', 10, 0), row('/c', 100, 10), row('/d', 900, 2)];
    expect(lowCtrPages(pages).map((p) => p.key)).toEqual(['/d', '/a']);
    expect(lostPages([row('/a', 50, 0)], [row('/a', 60, 3), row('/z', 10, 1), row('/y', 10, 0)]).map((p) => [p.key, p.before, p.impressions])).toEqual([['/a', 3, 50], ['/z', 1, 0]]);
    const qp = [{ query: 'q', page: '/a', clicks: 1, impressions: 10, ctr: 0.1, position: 2 }, { query: 'q', page: '/b', clicks: 0, impressions: 5, ctr: 0, position: 9 }, { query: 'r', page: '/a', clicks: 0, impressions: 3, ctr: 0, position: 4 }, { query: 's', page: '/a', clicks: 0, impressions: 0, ctr: 0, position: 0 }, { query: 's', page: '/c', clicks: 0, impressions: 2, ctr: 0, position: 0 }, { query: 't', page: '/x', clicks: 0, impressions: 30, ctr: 0, position: 0 }, { query: 't', page: '/y', clicks: 2, impressions: 30, ctr: 0, position: 0 }];
    expect(cannibalization(qp)).toEqual([{ key: 't', pages: 2, impressions: 60, clicks: 2, urls: ['/x', '/y'] }, { key: 'q', pages: 2, impressions: 15, clicks: 1, urls: ['/a', '/b'] }]);
    expect(byKey(pages).get('/b')?.impressions).toBe(10);
    expect(pathOf('https://exemple.test/fr/contact?x=1')).toBe('/fr/contact?x=1');
    expect(pathOf('pas une adresse')).toBe('pas une adresse');
  });
});

describe('analyses YouTube', () => {
  const day = (date: string, views: number) => ({ date, views, minutes: views * 2, gained: 1, lost: 0 });
  it('somme et périodes', () => {
    expect(sumDays([])).toEqual({ views: 0, minutes: 0, gained: 0, lost: 0, averageViewDuration: 0 });
    expect(sumDays([day('2026-11-01', 10), day('2026-11-02', 20)])).toEqual({ views: 30, minutes: 60, gained: 2, lost: 0, averageViewDuration: 120 });
    const p = lastDays([day('a', 1), day('b', 2), day('c', 3), day('d', 4)], 2);
    expect([p.start, p.end, p.totals.views, p.previous.views]).toEqual(['c', 'd', 7, 3]);
    expect(lastDays([], 7).start).toBe('');
  });
});

describe('carte', () => {
  const square = { properties: { iso2: 'XX' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] } };
  it('projection, chemins, couleurs, intensité', () => {
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
