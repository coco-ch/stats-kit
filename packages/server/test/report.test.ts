/// <reference lib="dom" />
// The e-mail report: languages counted in visitors, coherent rankings, sentence of the period, charts, amounts, Google and
// YouTube blocks, rising and falling, phone layout (rendered in Chrome at 375 and 320 px) and dark mode.
import { inflateSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTexts, formatMoney, mergeLanguages, type Item, type StatsOverview } from 'stats-kit/contract';
import { buildOverview, buildReport, createStatsKit, gscClient, loadWorld, previewHtml, renderCompare, renderSparkline, resolveRange, umamiClient, youtubeClient, SPARK_HEIGHT, SPARK_WIDTH } from 'stats-kit/server';
import { fakeFetch, fakeSources } from '../../../demo/fake/services.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const fake = fakeFetch({ now: () => NOW });
const sources = await fakeSources();
const en = createTexts('en');
const fr = createTexts('fr');
const overview = (days = 7, opts = {}) => buildOverview(umamiClient(sources.umami, fake), resolveRange({ days }, 'Europe/Paris', NOW), { timeZone: 'Europe/Paris', pages: { languages: ['en', 'fr', 'de'] }, ...opts }, NOW);
const item = (key: string, value: number, previous: number | null = null): Item => ({ key, label: null, value, previous });
/** Lines of a ranking of the text version: "TITLE" then "  - label: n". */
const section = (text: string, title: string) => {
  const lines = sp(text).split('\n');
  const at = lines.indexOf(title);
  const out: string[] = [];
  for (let i = at + 1; at >= 0 && i < lines.length && lines[i].startsWith('  - '); i++) out.push(lines[i].slice(4));
  return out;
};
/** Spaces of Intl (no-break, narrow no-break) as plain spaces. */
const sp = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
const sum = (rows: string[]) => rows.reduce((n, r) => n + Number(r.split(': ').at(-1)!.replace(/\D/g, '')), 0);

describe('languages of the report (regression: "English 713" for 404 visitors)', () => {
  it('counts the browser languages in visitors, variants together, and shows the language of the pages apart', async () => {
    const o = await overview();
    // what Harmonie had: page views of the /en/ pages under the title "Languages", more than the visitors of the week
    const real: StatsOverview = {
      ...o, totals: { ...o.totals, visitors: 404 },
      breakdowns: { ...o.breakdowns, languages: [item('fr-FR', 250), item('fr', 60), item('en-US', 40), item('en-GB', 20), item('de', 12)], siteLanguages: [item('en', 713), item('fr', 146), item('de', 39)] },
    };
    const m = buildReport({ overview: real, texts: fr, theme: { brand: '#b87333' }, siteName: 'Harmonie', world: null });
    expect(section(m.text, 'LANGUES')).toEqual(['français : 310', 'anglais : 60', 'allemand : 12']);
    expect(sum(section(m.text, 'LANGUES'))).toBeLessThanOrEqual(404);
    expect(section(m.text, 'LANGUE DU SITE CONSULTÉE')).toEqual(['anglais : 713', 'français : 146', 'allemand : 39']);
    for (const s of ['Langue du navigateur des visiteurs', 'Pages consultées, par langue du site']) expect(m.html).toContain(s);
    // a site that is not multilingual has no "site language" ranking
    const plain = buildReport({ overview: { ...real, breakdowns: { ...real.breakdowns, siteLanguages: [] } }, texts: en, theme: { brand: '#b87333' }, siteName: 'S', world: null });
    expect(plain.text).not.toContain('SITE LANGUAGE VIEWED');
  });
  it('merges the variants of a language, previous period included', () => {
    expect(mergeLanguages([item('fr-FR', 5, 4), item('en_US', 3, 1), item('fr', 2, null), item('EN', 3, 2), item('', 1)])).toEqual([
      { key: 'fr', label: null, value: 7, previous: null }, { key: 'en', label: null, value: 6, previous: 3 }, { key: '', label: null, value: 1, previous: null },
    ]);
    expect(mergeLanguages([item('de', 2), item('ca', 2)]).map((i) => i.key)).toEqual(['ca', 'de']);
  });
  it('no ranking counted in visitors adds up to more visitors than the period had', async () => {
    for (const days of [1, 7, 30, 90]) {
      const o = await overview(days);
      const b = o.breakdowns;
      const total = (items: Item[]) => items.reduce((n, i) => n + i.value, 0);
      for (const [name, items] of Object.entries({ countries: b.countries, languages: mergeLanguages(b.languages), devices: b.devices, browsers: b.browsers, os: b.os, screens: b.screens, referrers: b.referrers, channels: b.channels })) {
        expect.soft(total(items), `${name} over ${days} days`).toBeLessThanOrEqual(o.totals.visitors);
      }
      const m = buildReport({ overview: o, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
      for (const title of ['COUNTRIES', 'LANGUAGES', 'DEVICES', 'BROWSERS', 'TRAFFIC SOURCES']) expect.soft(sum(section(m.text, title)), `${title} over ${days} days`).toBeLessThanOrEqual(o.totals.visitors);
    }
  });
});

describe('sentence of the period, subject, preheader', () => {
  const week = async (visitors: number, before: number | null, countries: Item[]) => {
    const o = await overview();
    return buildReport({ overview: { ...o, totals: { ...o.totals, visitors }, previous: before === null ? null : { ...o.totals, visitors: before }, breakdowns: { ...o.breakdowns, countries } }, texts: fr, theme: { brand: '#1d3c9c' }, siteName: 'Harmonie', world: null, weekly: true });
  };
  it('quieter, busier, steady, first week; the country in the lead', async () => {
    const down = await week(404, 421, [item('FR', 300, 310), item('CH', 40, 60)]);
    expect(sp(down.text).split('\n')[2]).toBe('Semaine plus calme : 404 visiteurs, 4 % de moins ; toujours en tête : France');
    expect(sp(down.subject)).toBe('Harmonie — 404 visiteurs cette semaine (-4 %)');
    expect(sp(down.html)).toContain('Semaine plus calme : 404 visiteurs, 4 % de moins ; toujours en tête : France</div>');
    expect(down.html.indexOf('Semaine plus calme')).toBeLessThan(down.html.indexOf('<table')); // also the preheader
    expect(sp((await week(500, 400, [item('CH', 300, 10), item('FR', 200, 250)])).text)).toContain('Semaine plus chargée : 500 visiteurs, 25 % de plus ; nouveau pays en tête : Suisse');
    expect(sp((await week(400, 400, [])).text)).toContain('Semaine stable : 400 visiteurs, autant qu’avant\n');
    const first = await week(12, null, [item('FR', 10)]);
    expect(first.text).toContain('12 visiteurs cette semaine\n');
    expect(first.subject).toBe('Harmonie — 12 visiteurs cette semaine');
  });
  it('another length than a week; no figures: subject and preheader without them', async () => {
    const o = await overview(30);
    expect(buildReport({ overview: o, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null }).text).toMatch(/\n(Busier|Quieter|Steady) period: [\d,]+ visitors/);
    const off = await buildOverview(null, resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW);
    const m = buildReport({ overview: off, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null, weekly: true });
    expect(m.subject).toBe('S — weekly traffic report');
    expect(m.html).toContain('Traffic report from');
    const zh = buildReport({ overview: { ...o, previous: null }, texts: createTexts('zh'), theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    expect(zh.subject).not.toContain('（）');
  });
});

describe('charts of the key figures (PNG)', () => {
  const pixels = (png: Uint8Array) => {
    const b = Buffer.from(png);
    const idat = b.indexOf('IDAT');
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colour: b[25], raw: inflateSync(b.subarray(idat + 4, idat + 4 + b.readUInt32BE(idat - 4))) };
  };
  it('trend line and comparison bars: transparent RGBA, same pixels every time', () => {
    const line = renderSparkline([3, 9, 4, 12, 0, 7], [29, 60, 156])!;
    const p = pixels(line);
    expect([p.width, p.height, p.colour, p.raw.length]).toEqual([SPARK_WIDTH, SPARK_HEIGHT, 6, (SPARK_WIDTH * 4 + 1) * SPARK_HEIGHT]);
    const alpha = [...p.raw].filter((_, i) => i % (SPARK_WIDTH * 4 + 1) % 4 === 0 && i % (SPARK_WIDTH * 4 + 1) > 0);
    expect(alpha.some((a) => a === 0)).toBe(true);
    expect(alpha.some((a) => a === 255)).toBe(true);
    expect(Buffer.from(renderSparkline([3, 9, 4, 12, 0, 7], [29, 60, 156])!).equals(Buffer.from(line))).toBe(true);
    expect(renderSparkline([5, 5, 5], [0, 0, 0])).not.toBeNull(); // flat: a line in the middle
    expect(renderSparkline([4], [0, 0, 0])).toBeNull();
    expect(renderSparkline([0, 0], [0, 0, 0])).toBeNull();
    const bars = pixels(renderCompare(10, 4, [29, 60, 156], [200, 200, 200])!);
    expect([bars.width, bars.height, bars.colour]).toEqual([SPARK_WIDTH, SPARK_HEIGHT, 6]);
    expect(renderCompare(0, 0, [0, 0, 0], [0, 0, 0])).toBeNull();
    expect(renderCompare(0, 3, [0, 0, 0], [9, 9, 9])).not.toBeNull();
  });
});

describe('amounts in the language of the report', () => {
  const sp = (s: string) => s.replace(/[  ]/g, ' ');
  it('symbol and separators of the locale, no decimals for a whole amount, other codes after the amount', () => {
    expect(formatMoney(en, 12.5, 'usd')).toBe('$12.50');
    expect(sp(formatMoney(fr, 12.5, 'USD'))).toBe('12,50 $');
    expect(sp(formatMoney(fr, 1490, 'EUR'))).toBe('1 490 €');
    expect(sp(formatMoney(createTexts('de-CH'), 30, 'CHF'))).toBe('CHF 30');
    expect(formatMoney(en, 12.5, 'XYZ')).toBe('12.50 XYZ');
    expect(formatMoney(en, 3, '')).toBe('3');
    expect(formatMoney(en, Number.NaN, 'EUR')).toBe('—');
  });
});

describe('blocks of the report', () => {
  it('Google: four figures with their change, top queries, pages gaining clicks; YouTube: figures and top videos', async () => {
    const o = await overview();
    const search = await gscClient(sources.gsc, fake).overview({ days: 7 }, NOW);
    const youtube = await youtubeClient(sources.youtube, fake).overview(7, undefined, NOW);
    const videos = [{ title: 'Tour <1>', url: 'https://youtube.example.test/a', views: 120 }, { title: 'Oak', url: 'https://youtube.example.test/b', views: 0 }];
    const m = buildReport({ overview: o, search, youtube, youtubeVideos: videos, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    for (const s of ['Click-through rate', 'Average position', 'Top queries', 'Pages gaining clicks', 'Most viewed videos', 'Tour &#60;1&#62;']) expect(m.html).toContain(s);
    expect(m.html).not.toContain('>Oak<'); // no view over the period
    expect(m.text).toMatch(/ {2}Top queries\n {4}- example workshop: \d+ \/ \d+/);
    expect(m.text).toContain('    - Tour <1>: 120 https://youtube.example.test/a');
    expect(m.text).toMatch(/Click-through rate: [\d.]+%/);
    // without a previous period in Google: no change for the rate and the position
    const fresh = buildReport({ overview: o, search: { ...search, previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, previousPages: [] }, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    expect(fresh.text).toMatch(/Click-through rate: [\d.]+%\n/);
  });
  it('rising and falling pages and sources; nothing when nothing moved', async () => {
    const o = await overview();
    const moved: StatsOverview = { ...o, breakdowns: { ...o.breakdowns, pages: [item('/a', 30, 10), item('/b', 5, 20), item('/c', 4, 4), item('/d', 3, null)], referrers: [item('', 50, 40), item('bing.com', 2, 9)] } };
    const m = buildReport({ overview: moved, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    expect(m.text).toContain('RISING AND FALLING\n  Rising\n    - /a (Page): +20\n    - (direct) (Source): +10\n  Falling\n    - /b (Page): -15\n    - bing.com (Source): -7');
    const only = buildReport({ overview: { ...moved, breakdowns: { ...moved.breakdowns, pages: [item('/a', 30, 10)], referrers: [] } }, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    expect(only.text).toContain('  Rising\n    - /a (Page): +20\n');
    expect(only.text).not.toContain('Falling');
    const still = buildReport({ overview: { ...moved, breakdowns: { ...moved.breakdowns, pages: [item('/c', 4, 4)], referrers: [] } }, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    expect(still.text).not.toContain('RISING AND FALLING');
  });
  it('key figures: bounce rate in points (a fall is good news), duration, pages per visit, visits per visitor', async () => {
    const o = await overview();
    const m = buildReport({ overview: { ...o, totals: { ...o.totals, visits: 100, bounces: 40, totaltime: 9000, pageviews: 250, visitors: 80 }, previous: { ...o.totals, visits: 100, bounces: 45, totaltime: 9000, pageviews: 200, visitors: 80 } }, texts: en, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null });
    for (const s of ['Bounce: 40%  (-5 pt)', 'Average duration: 1 min 30 secs  (0%)', 'Pages per visit: 2.5  (+25%)', 'Visits per visitor: 1.3  (0%)']) expect(m.text.replace(/[  ]/g, ' ')).toContain(s);
    expect(m.html).toContain('class="sk-up" style="color:#0b7a5c;font-weight:700">▼ -5 pt');
    expect(m.html).toContain('>= 0%</span>');
  });
  it('site cards: one light line of figures, no card inside the card', async () => {
    const o = await overview();
    const m = buildReport({ overview: o, texts: fr, theme: { brand: '#1d3c9c' }, siteName: 'S', world: null, blocks: [{ title: 'Coûts', figures: [{ value: formatMoney(fr, 12.5, 'USD'), label: 'Usage IA', sub: '7 j' }] }] });
    const card = m.html.slice(m.html.indexOf('Coûts'));
    expect(card.slice(0, card.indexOf('</table></td></tr></table>'))).not.toContain('border-radius:12px');
    expect(m.html).toMatch(/12,50[   ]\$/);
  });
});

describe('phone and dark mode (rendered in Chrome)', () => {
  let browser: Awaited<ReturnType<typeof chromium.launch>>;
  beforeAll(async () => { browser = await chromium.launch({ channel: 'chrome' }); });
  afterAll(async () => { await browser?.close(); });
  const report = async (locale: string) => {
    const kit = createStatsKit({
      siteName: 'Example Workshop', timeZone: 'Europe/Paris', locale, ...sources, fetch: fake, now: () => NOW,
      pages: { languages: ['en', 'fr', 'de'], labels: { '/': 'Home' } }, goals: [{ id: 'calls', label: 'Calls', events: ['phone-click'] }],
      report: { theme: { brand: '#1d3c9c' }, statsUrl: 'https://www.example.test/admin', blocks: () => [{ title: 'Costs', figures: [{ value: '$12.50', label: 'AI usage' }, { value: '$30', label: 'Subscriptions / month' }], lines: ['Anthropic: $9.25'] }] },
      world: loadWorld(),
    });
    return previewHtml(await kit.report({ days: '7' }, true));
  };
  for (const locale of ['en', 'fr']) {
    for (const width of [375, 320]) {
      it(`${locale}, ${width} px: no horizontal scrolling, figures two by two, cards on one column, no word cut`, async () => {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        await page.setContent(await report(locale));
        const r = await page.evaluate(() => {
          const box = (e: Element) => e.getBoundingClientRect();
          const tiles = [...document.querySelectorAll('td.sk-q')].filter((e) => e.querySelector('.sk-fig')).slice(0, 4).map(box);
          const cols = [...document.querySelectorAll('td.sk-col')].filter((e) => e.querySelector('.sk-card')).map(box);
          // a word cut over two lines has two boxes
          const cut: string[] = [];
          const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            const t = n.textContent ?? '';
            for (const m of t.matchAll(/\S+/g)) {
              const range = document.createRange();
              range.setStart(n, m.index!);
              range.setEnd(n, m.index! + m[0].length);
              const lines = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
              if (lines.size > 1) cut.push(m[0]);
            }
          }
          return { overflow: document.documentElement.scrollWidth - window.innerWidth, tiles: tiles.map((b) => [Math.round(b.left), Math.round(b.top), Math.round(b.width)]), cols: cols.map((b) => Math.round(b.width)), cut };
        });
        expect(r.overflow).toBeLessThanOrEqual(0);
        expect(r.cut).toEqual([]);
        const [a, b, c, d] = r.tiles;
        expect([a[1] === b[1], c[1] > a[1], c[1] === d[1], a[0] === c[0]]).toEqual([true, true, true, true]);
        expect(a[2]).toBeGreaterThan(width / 2 - 40);
        expect(r.cols.length).toBeGreaterThan(4);
        for (const w of r.cols) expect(w).toBeGreaterThan(width - 60);
        await page.close();
      });
    }
  }
  it('computer: four figures on one line, cards two by two', async () => {
    const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
    await page.setContent(await report('en'));
    const tops = await page.evaluate(() => [...document.querySelectorAll('td.sk-q')].filter((e) => e.querySelector('.sk-fig')).slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.close();
  });
  it('dark mode: dark backgrounds, light texts; light mode unchanged', async () => {
    const html = await report('en');
    const colours = async (scheme: 'light' | 'dark') => {
      const page = await browser.newPage({ viewport: { width: 820, height: 800 }, colorScheme: scheme });
      await page.setContent(html);
      const c = await page.evaluate(() => ({
        body: getComputedStyle(document.body).backgroundColor,
        card: getComputedStyle(document.querySelector('.sk-card')!).backgroundColor,
        ink: getComputedStyle(document.querySelector('.sk-ink')!).color,
      }));
      await page.close();
      return c;
    };
    expect(await colours('light')).toEqual({ body: 'rgb(244, 245, 249)', card: 'rgb(255, 255, 255)', ink: 'rgb(20, 26, 42)' });
    expect(await colours('dark')).toEqual({ body: 'rgb(17, 19, 24)', card: 'rgb(27, 30, 38)', ink: 'rgb(243, 244, 248)' });
    expect(html).toContain('[data-ogsc] .sk-ink{');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
  });
});
