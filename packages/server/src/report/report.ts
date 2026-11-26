/*
 * Traffic report by e-mail (weekly or on demand): a sentence that sums up the period, the site's business figures (requests to
 * handle, customers, subscriptions…, given by the site), key figures with their change and a small chart, goals, site data, rising and falling pages and sources, world map, page views per day, heatmap, Google, YouTube,
 * rankings, site-specific cards. A plain-text version comes with it. Every text comes from the texts of the chosen language;
 * numbers, amounts, dates, weekdays and hours are formatted with Intl. Images (map, charts) are PNG attachments ("cid:").
 * The library sends nothing: the message is handed to the site's sending function.
 */
import {
  bestSlot, browserName, countryName, deviceName, fill, formatDuration, formatMoney, formatNumber, formatPercent, hourName, labelValue, languageName, longDay,
  mergeLanguages, pathOf, percentChange, shortDate, slotLabel, weekdayName,
  type Item, type SearchOverview, type StatsOverview, type Texts, type World, type YoutubeOverview,
} from 'stats-kit/contract';
import { CARD_INNER, esc, mailKit, type Figure } from './mail-kit.ts';
import { renderWorldMap } from './map-png.ts';
import type { ReportDaily } from './daily.ts';
import { SPARK_HEIGHT, SPARK_WIDTH, renderSparkline } from './spark-png.ts';
import { palette, rgb, type ReportTheme } from './theme.ts';

/** Attachment shown in the message ("cid:"). */
export interface InlineAttachment {
  cid: string;
  filename: string;
  contentType: string;
  content: Uint8Array;
}

/** Message ready to be handed to the site's sending function. */
export interface ReportMessage {
  subject: string;
  html: string;
  text: string;
  attachments: InlineAttachment[];
}

/** Video of the report: title (or the site's label), address, views over the period. */
export interface ReportVideo {
  title: string;
  url: string;
  views: number;
}

export interface ReportInput {
  overview: StatsOverview;
  search?: SearchOverview | null;
  youtube?: YoutubeOverview | null;
  /** Most viewed videos of the period, most viewed first (report). */
  youtubeVideos?: ReportVideo[] | null;
  /** @deprecated since 0.2.9, use `youtubeVideos`. Most viewed video of the period. */
  youtubeTop?: ReportVideo | null;
  texts: Texts;
  theme: ReportTheme;
  siteName: string;
  /** Statistics page of the administration (report button). */
  statsUrl?: string | null;
  /** Google and YouTube pages of the administration (link at the end of their block). */
  searchUrl?: string | null;
  youtubeUrl?: string | null;
  /** Weekly report (different subject). */
  weekly?: boolean;
  /** Base map; `null`: no map. */
  world: World | null;
  /** "At a glance" card: top source, country, page and entry page, best day, busiest slot (true by default). */
  glance?: boolean;
  /** Site-specific cards, shown after the rankings (costs, requests, news of the site…). */
  blocks?: ReportBlock[];
  /** Business figures of the site (requests, customers, subscriptions, service status…), shown first, under the sentence. */
  business?: ReportBusiness | null;
  /** Visits and bounces day by day (charts of the "Visits" and "Bounce" figures); without them, no chart there. */
  daily?: ReportDaily | null;
  /** Occurrences of each goal per slot, by goal id (charts of the goals). */
  goalSeries?: Record<string, number[]> | null;
}

/**
 * Site-specific card of the report: a title, then figures and/or lines, all given by the site in its language. Amounts are best
 * formatted with `formatMoney(kit.texts, 12.5, 'USD')` ("$12.50", "12,50 $").
 */
export interface ReportBlock {
  title: string;
  hint?: string;
  /** Key figures, on one light line (three per row, two on a phone). */
  figures?: { value: string; label: string; sub?: string }[];
  /** Lines of text, bulleted. */
  lines?: string[];
}

/**
 * Business figures of the site, at the top of the report: what the site itself counts (requests received and to handle,
 * customers, trials, subscriptions, revenue, documents, messages, costs…), with the state of its services. Every text is given by
 * the site in its language; numbers and amounts are formatted by the library in the language of the report.
 */
export interface ReportBusiness {
  /** Title of the section (default: `report.businessTitle`, "Your business"). */
  title?: string | null;
  /** Line under the title (default: `report.businessHint`). */
  hint?: string | null;
  /** Key figures, four per row (two by two on a phone), in the given order; figures of the same `group` together under its name. */
  kpis: BusinessKpi[];
  /** State of the services and alerts, under the figures. */
  status?: BusinessStatus | null;
  /** Link to the administration, at the end of the section. */
  link?: { url: string; label: string } | null;
}

/** A business figure. Leave out a figure the site cannot read: never a zero standing for "unknown". */
export interface BusinessKpi {
  /** Stable identifier (name of its chart image). */
  id: string;
  label: string;
  /** Number (formatted in the language of the report), or a text already formatted ("3 of 5"). */
  value: number | string;
  /** Value of the previous period (a number value only): change shown under the figure. */
  previous?: number | null;
  /** ISO 4217 currency of a number value: formatted as an amount ("1 490 €", "$12.50"). */
  currency?: string | null;
  /** Line under the figure ("2 to handle", "ends within 7 days"). */
  sub?: string | null;
  /** Values per slot of the period, oldest first: a small chart (two values at least). */
  series?: number[] | null;
  /** A figure that should go down (costs, errors): a fall is good news. */
  lowerIsBetter?: boolean;
  /** Something to do (requests to handle…): the figure is shown in amber. */
  highlight?: boolean;
  /** Name of the group of the figure ("Requests", "Customers"…). */
  group?: string | null;
  /** Screen of the administration where to act. */
  link?: { url: string; label: string } | null;
}

/** State of the site's services: overall tone, a title, and the alerts in lines. */
export interface BusinessStatus {
  tone: 'ok' | 'warn' | 'down';
  title: string;
  lines?: string[];
}

export const MAP_CID = 'stats-kit-map';
export const LOGO_CID = 'stats-kit-logo';

/** Preview: the attached images are replaced by their content, to be shown outside a mail client. */
export function previewHtml(m: ReportMessage): string {
  return m.attachments.reduce((html, a) => html.split(`cid:${a.cid}`).join(`data:${a.contentType};base64,${Buffer.from(a.content).toString('base64')}`), m.html);
}

const top = (items: Item[] | undefined, label: (i: Item) => string, n = 6): [string, number][] => (items ?? []).slice(0, n).map((i) => [label(i), i.value]);

export function buildReport(input: ReportInput): ReportMessage {
  const { overview: o, texts, siteName } = input;
  const R = texts.report;
  const C = palette(input.theme);
  const K = mailKit(C, texts);
  const nf = (v: number, d = 0, signed = false) => formatNumber(texts, v, d, signed);
  const lv = (label: string, value: string | number) => labelValue(texts, label, value);
  const upper = (s: string) => s.toLocaleUpperCase(texts.locale);
  const muted = (x: string) => `<span class="sk-mu" style="color:${C.muted}">${esc(x)}</span>`;
  const tz = o.range.timeZone;
  const last = new Date(Date.parse(o.range.to) - 1).toISOString();
  const from = shortDate(texts, o.range.from, tz), to = shortDate(texts, last, tz);
  const ok = o.status === 'ok';
  const s = o.totals, p = o.previous;
  const ser = o.series;
  const change = ok ? percentChange(s.visitors, p?.visitors) : null;
  // the totals are also available to the subject, the title, the introduction and the footer ({visitors}, {change}…)
  const vars = {
    site: siteName, from, to, period: fill(texts.periods.short, { from, to }), days: o.range.days,
    visitors: ok ? nf(s.visitors) : '', pageviews: ok ? nf(s.pageviews) : '', visits: ok ? nf(s.visits) : '',
    change: change === null ? '' : formatPercent(texts, change / 100, 0, true),
  };
  const attachments: ReportMessage['attachments'] = [];
  const rows: string[] = [];
  const text: string[] = [`${siteName} — ${R.title} (${fill(R.subtitle, vars)})`, ''];
  /** Change in brackets for the text version. */
  const t = (n: number, b: number | null | undefined) => { const c = percentChange(n, b); return c === null ? '' : `  (${formatPercent(texts, c / 100, 0, true)})`; };
  const tpts = (n: number, b: number | null, digits: number) => (b === null ? '' : `  (${fill(texts.common.points, { n: nf(Math.round((n - b) * 10 ** digits) / 10 ** digits, digits, true) })})`);

  // small charts of the figures (attached PNG, transparent background), in the light shade of the brand: readable on a white
  // card and on a dark one
  const accent = rgb(C.accent);
  const image = (name: string, png: Uint8Array | null) => {
    if (!png) return '';
    const cid = `stats-kit-${name}`;
    attachments.push({ cid, filename: `${name}.png`, contentType: 'image/png', content: png });
    return K.spark(cid, SPARK_WIDTH, SPARK_HEIGHT);
  };
  const line = (name: string, values: number[] | null | undefined) => (values ? image(name, renderSparkline(values, accent)) : '');
  const daily = input.daily;

  let logo = '';
  const l = C.logo;
  if (l?.png) {
    attachments.push({ cid: LOGO_CID, filename: 'logo.png', contentType: 'image/png', content: l.png });
    logo = `<img src="cid:${LOGO_CID}" width="${l.width ?? 120}"${l.height ? ` height="${l.height}"` : ''} alt="${esc(l.alt ?? siteName)}" style="display:block;border:0;height:auto">`;
  } else if (l?.url) {
    logo = `<img src="${esc(l.url)}" width="${l.width ?? 120}"${l.height ? ` height="${l.height}"` : ''} alt="${esc(l.alt ?? siteName)}" style="display:block;border:0;height:auto">`;
  }
  rows.push(K.header(siteName, R.title, fill(R.subtitle, vars), logo));

  // the period in one sentence: "Quieter week: 404 visitors, 4% fewer; France still in the lead"
  let headline = '';
  if (ok) {
    const week = o.range.days === 7;
    const tpl = change === null ? (week ? R.headlineNewWeek : R.headlineNew)
      : change > 0 ? (week ? R.headlineUpWeek : R.headlineUp)
        : change < 0 ? (week ? R.headlineDownWeek : R.headlineDown)
          : (week ? R.headlineFlatWeek : R.headlineFlat);
    headline = fill(tpl, { visitors: nf(s.visitors), change: change === null ? '' : formatPercent(texts, Math.abs(change) / 100, 0) });
    const cs = o.breakdowns.countries;
    if (cs[0]?.value && cs.some((c) => c.previous)) {
      let before = cs[0];
      for (const c of cs) if ((c.previous ?? 0) > (before.previous ?? 0)) before = c;
      headline = fill(R.headlineJoin, { a: headline, b: fill(before.key === cs[0].key ? R.headlineLeadSame : R.headlineLeadNew, { country: countryName(texts, cs[0].key) }) });
    }
    rows.push(K.headline(headline));
    text.push(headline, '');
  }
  if (R.intro) {
    rows.push(K.paragraph(fill(R.intro, vars)));
    text.push(fill(R.intro, vars), '');
  }

  // the site's business figures first: what needs doing, then how the business goes
  const biz = input.business;
  if (biz && (biz.kpis.length || biz.status)) {
    // one card (a light message: Gmail cuts a message beyond 102 KB): the figures by group, the state of the services, the link
    const title = biz.title || R.businessTitle, hint = biz.hint ?? R.businessHint;
    let inner = K.h2(title, hint);
    text.push(upper(title));
    const groups: { name: string; kpis: BusinessKpi[] }[] = [];
    for (const x of biz.kpis) {
      const name = x.group ?? '';
      const grp = groups.find((g) => g.name === name);
      if (grp) grp.kpis.push(x);
      else groups.push({ name, kpis: [x] });
    }
    const value = (x: BusinessKpi) => (typeof x.value === 'number' ? (x.currency ? formatMoney(texts, x.value, x.currency) : nf(x.value)) : x.value);
    const compared = (x: BusinessKpi) => typeof x.value === 'number' && x.previous !== null && x.previous !== undefined;
    for (const grp of groups) {
      if (grp.name) {
        inner += K.h3(grp.name);
        text.push(`  ${grp.name}`);
      }
      inner += K.tiles(grp.kpis.map((x): Figure => {
        const change = compared(x) ? K.trend(x.value as number, x.previous, x.lowerIsBetter) : '';
        const go = x.link ? `<a href="${esc(x.link.url)}" class="sk-ac" style="color:${C.accentDeep}">${esc(x.link.label)}</a>` : '';
        const sub = [change === '&nbsp;' ? '' : change, x.sub ? muted(x.sub) : '', go].filter(Boolean).join('<br>');
        const chart = x.series && x.series.length > 1 ? line(`business-${x.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`, x.series) : '';
        return { value: value(x), label: x.label, sub, image: chart, tone: x.highlight ? 'warn' : undefined };
      }));
      for (const x of grp.kpis) text.push(`  - ${lv(x.label, value(x))}${compared(x) ? t(x.value as number, x.previous) : ''}${x.sub ? ` — ${x.sub}` : ''}${x.link ? ` ${x.link.url}` : ''}`);
    }
    if (biz.status) {
      const lines = biz.status.lines ?? [];
      inner += K.status(biz.status.tone, biz.status.title, lines, biz.kpis.length > 0);
      text.push(`  ${biz.status.title}`, ...lines.map((x) => `    - ${x}`));
    }
    if (biz.link) {
      inner += K.link(biz.link.url, biz.link.label);
      text.push(`  ${biz.link.url}`);
    }
    rows.push(K.card(inner));
    // the traffic of the site under its own title, so that the two parts read apart
    rows.push(K.section(R.trafficTitle));
    text.push('', upper(R.trafficTitle));
  }

  if (ok) {
    const bounceNow = s.visits ? s.bounces / s.visits : 0;
    const bounceBefore = p && p.visits ? p.bounces / p.visits : null;
    const avgNow = s.visits ? s.totaltime / s.visits : 0;
    const avgBefore = p && p.visits ? p.totaltime / p.visits : null;
    const ppvNow = s.visits ? s.pageviews / s.visits : 0;
    const ppvBefore = p && p.visits ? p.pageviews / p.visits : null;
    const vpvNow = s.visitors ? s.visits / s.visitors : 0;
    const vpvBefore = p && p.visitors ? p.visits / p.visitors : null;
    const bounce = formatPercent(texts, bounceNow, 0);
    const avg = formatDuration(texts, Math.round(avgNow));
    rows.push(K.kpiRow([
      { value: nf(s.visitors), label: R.visitors, sub: K.trend(s.visitors, p?.visitors), image: line('visitors', ser.visitors) },
      { value: nf(s.pageviews), label: R.pageviews, sub: K.trend(s.pageviews, p?.pageviews), image: line('pageviews', ser.pageviews) },
      { value: nf(s.visits), label: R.visits, sub: K.trend(s.visits, p?.visits), image: line('visits', daily?.visits) },
      { value: bounce, label: R.bounce, sub: K.gap(bounceNow * 100, bounceBefore === null ? null : bounceBefore * 100, 0, texts.common.points, true), image: line('bounce', daily?.visits.map((v, i) => (v ? daily.bounces[i] / v : 0))) },
    ]));
    rows.push(K.card(K.figures([
      { value: avg, label: R.avgDurationLabel, sub: K.trend(avgNow, avgBefore) },
      { value: nf(ppvNow, 1), label: R.pagesPerVisit, sub: K.trend(ppvNow, ppvBefore) },
      { value: nf(vpvNow, 1), label: R.visitsPerVisitor, sub: K.trend(vpvNow, vpvBefore) },
    ])));
    text.push(lv(R.visitors, `${nf(s.visitors)}${t(s.visitors, p?.visitors)}`), lv(R.pageviews, `${nf(s.pageviews)}${t(s.pageviews, p?.pageviews)}`),
      lv(R.visits, `${nf(s.visits)}${t(s.visits, p?.visits)}`), lv(R.bounce, `${bounce}${tpts(bounceNow * 100, bounceBefore === null ? null : bounceBefore * 100, 0)}`),
      lv(R.avgDurationLabel, `${avg}${t(avgNow, avgBefore)}`), lv(R.pagesPerVisit, `${nf(ppvNow, 1)}${t(ppvNow, ppvBefore)}`), lv(R.visitsPerVisitor, `${nf(vpvNow, 1)}${t(vpvNow, vpvBefore)}`));
    if (o.goals.length) {
      rows.push(K.kpiRow(o.goals.map((g) => ({ value: nf(g.value), label: g.label, sub: K.trend(g.value, g.previous), image: line(`goal-${g.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`, input.goalSeries?.[g.id]) }))));
      for (const g of o.goals) text.push(lv(g.label, `${nf(g.value)}${t(g.value, g.previous)}`));
    }
  } else {
    const note = o.status === 'not-configured' ? R.notConfigured : R.unavailable;
    rows.push(K.note(note));
    text.push(note);
  }

  const extras = o.extras;
  if (extras?.tiles.length) {
    const plain = extras.tiles.filter((x) => !x.highlight);
    const strong = extras.tiles.filter((x) => x.highlight);
    const value = (x: { value: number | string }) => (typeof x.value === 'number' ? nf(x.value) : x.value);
    if (plain.length) rows.push(K.kpiRow(plain.map((x): Figure => ({ value: value(x), label: x.label, sub: typeof x.value === 'number' ? K.trend(x.value, x.previous) : x.sub ? esc(x.sub) : '' }))));
    const link = (x: (typeof strong)[number]) => (x.link ? ` <a href="${esc(x.link.url)}" class="sk-ac" style="color:${C.accentDeep}">${esc(x.link.label)}</a>` : '');
    for (const x of strong) rows.push(K.callout(`<b>${esc(lv(x.label, value(x)))}</b>${x.sub ? ` — ${esc(x.sub)}` : ''}${link(x)}`));
    for (const x of extras.tiles) text.push(`${lv(x.label, value(x))}${x.sub ? ` (${x.sub})` : ''}${x.highlight && x.link ? ` ${x.link.url}` : ''}`);
  }
  rows.push('<tr><td style="font-size:0;line-height:8px">&nbsp;</td></tr>');

  const bestIndex = ser.pageviews.reduce((b, v, i) => (v > ser.pageviews[b] ? i : b), 0);
  const label = (x: string) => slotLabel(texts, x, ser.unit);
  const bestDay = ok && ser.pageviews[bestIndex] ? fill(R.bestDay, { d: ser.unit === 'day' ? longDay(texts, ser.slots[bestIndex]) : label(ser.slots[bestIndex]), n: nf(ser.pageviews[bestIndex]) }) : '';
  const slot = ok ? bestSlot(o.heatmap) : null;
  const when = slot ? fill(R.slot, { day: weekdayName(texts, slot.day), hour: hourName(texts, slot.hour) }) : '';
  const own = (i: Item) => i.label ?? i.key;
  const source = (i: Item) => i.label ?? (i.key || texts.common.direct);

  if (ok && input.glance !== false) {
    const b = o.breakdowns;
    const first = (template: string, items: Item[], name: (i: Item) => string) => (items[0]?.value ? fill(template, { label: name(items[0]), n: nf(items[0].value) }) : '');
    const glance = [
      first(R.glanceSource, b.referrers, source),
      first(R.glanceCountry, b.countries, (i) => countryName(texts, i.key)),
      first(R.glancePage, b.pages, own),
      first(R.glanceEntry, b.entries, own),
      bestDay,
      when && fill(R.glanceSlot, { slot: when }),
    ].filter(Boolean);
    if (glance.length) {
      rows.push(K.card(`${K.h2(R.glanceTitle)}${K.bullets(glance)}`));
      text.push('', upper(R.glanceTitle), ...glance.map((x) => `  - ${x}`));
    }
  }

  // rising and falling: pages and sources that gained or lost the most against the previous period
  if (ok) {
    type Move = { label: string; tag: string; d: number };
    const moves = (items: Item[], tag: string, name: (i: Item) => string): Move[] =>
      items.filter((i) => i.previous !== null && i.value !== i.previous).map((i) => ({ label: name(i), tag, d: i.value - (i.previous ?? 0) }));
    const pool = [...moves(o.breakdowns.pages, R.moverPage, own), ...moves(o.breakdowns.referrers, R.moverSource, source)];
    const up = pool.filter((m) => m.d > 0).sort((a, b) => b.d - a.d || a.label.localeCompare(b.label)).slice(0, 4);
    const down = pool.filter((m) => m.d < 0).sort((a, b) => a.d - b.d || a.label.localeCompare(b.label)).slice(0, 4);
    if (up.length || down.length) {
      const col = (title: string, list: Move[], tone: 'up' | 'down') => (list.length ? `${K.h3(title)}${K.moves(list.map((m) => ({ label: m.label, tag: m.tag, text: nf(m.d, 0, true), tone })))}` : '');
      const a = col(R.moversUp, up, 'up'), b = col(R.moversDown, down, 'down');
      rows.push(K.card(`${K.h2(R.moversTitle, R.moversHint)}${a && b ? K.split(a, b) : a || b}`));
      text.push('', upper(R.moversTitle));
      for (const [title, list] of [[R.moversUp, up], [R.moversDown, down]] as const) {
        if (list.length) text.push(`  ${title}`, ...list.map((m) => `    - ${lv(`${m.label} (${m.tag})`, nf(m.d, 0, true))}`));
      }
    }
  }

  if (ok && input.world && o.breakdowns.countries.length) {
    const M = C.map;
    const map = renderWorldMap(o.breakdowns.countries, input.world, { background: rgb(M.background), land: rgb(M.land), border: rgb(M.border), low: rgb(M.low), high: rgb(M.high) });
    attachments.push({ cid: MAP_CID, filename: 'map.png', contentType: 'image/png', content: map.png });
    rows.push(K.card(`${K.h2(R.mapTitle, R.mapHint)}<img src="cid:${MAP_CID}" width="${CARD_INNER}" alt="${esc(R.mapAlt)}" style="display:block;width:100%;max-width:${CARD_INNER}px;height:auto;border-radius:10px;border:0">`));
  }

  if (ok && ser.slots.length > 1) {
    const prev = ser.previousPageviews;
    const titles = ser.slots.map((x, i) => lv(label(x), prev ? `${nf(ser.pageviews[i])} / ${nf(prev[i] ?? 0)}` : nf(ser.pageviews[i])));
    rows.push(K.card(`${K.h2(R.dailyTitle, bestDay)}${K.bars(ser.pageviews, label(ser.slots[0]), label(ser.slots.at(-1)!), titles, prev, [R.dailyCurrent, R.dailyPrevious])}`));
    if (bestDay && input.glance === false) text.push('', bestDay);
  }
  if (slot) {
    const days = Array.from({ length: 7 }, (_, d) => weekdayName(texts, d, 'short'));
    rows.push(K.card(`${K.h2(R.heatTitle, fill(R.heatHint, { slot: when, tz }))}${K.heat(o.heatmap, days)}`));
    text.push(fill(R.heatHint, { slot: when, tz }));
  }

  // Google
  const g = input.search;
  if (g?.status === 'ok') {
    const gv = { from: shortDate(texts, g.start), to: shortDate(texts, g.end) };
    const gt = g.totals, gp = g.previous;
    const before = gp.impressions > 0;
    let inner = `<div ${K.ts('13px/1.5', 400, C.muted)}>${esc(R.googleNothing)}</div>`;
    text.push('', `${upper(R.googleTitle)} (${fill(texts.periods.short, gv)})`);
    if (gt.impressions) {
      inner = K.figures([
        { value: nf(gt.clicks), label: R.googleClicks, sub: K.trend(gt.clicks, gp.clicks) },
        { value: nf(gt.impressions), label: R.googleImpressions, sub: K.trend(gt.impressions, gp.impressions) },
        { value: formatPercent(texts, gt.ctr, 1), label: R.googleCtr, sub: before ? K.gap(gt.ctr * 100, gp.ctr * 100, 1, texts.common.points, false) : '&nbsp;' },
        { value: nf(gt.position, 1), label: R.googlePosition, sub: before ? K.gap(gt.position, gp.position, 1, null, true) : '&nbsp;' },
      ], 4);
      text.push(`  - ${lv(R.googleClicks, `${nf(gt.clicks)}${t(gt.clicks, gp.clicks)}`)}`, `  - ${lv(R.googleImpressions, `${nf(gt.impressions)}${t(gt.impressions, gp.impressions)}`)}`,
        `  - ${lv(R.googleCtr, `${formatPercent(texts, gt.ctr, 1)}${before ? tpts(gt.ctr * 100, gp.ctr * 100, 1) : ''}`)}`, `  - ${lv(R.googlePosition, nf(gt.position, 1))}`);
      const queries = [...g.queries].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.key.localeCompare(b.key)).slice(0, 5);
      if (queries.length) {
        inner += `<div style="height:10px;line-height:10px;font-size:0">&nbsp;</div>${K.grid([R.googleTopQueries, R.googleColClicks, R.googleColImpressions], queries.map((q) => [esc(q.key), esc(nf(q.clicks)), esc(nf(q.impressions))]))}`;
        text.push(`  ${R.googleTopQueries}`, ...queries.map((q) => `    - ${lv(q.key, `${nf(q.clicks)} / ${nf(q.impressions)}`)}`));
      }
      const prevPages = new Map(g.previousPages.map((x) => [x.key, x.clicks]));
      const gains = g.pages.map((x) => ({ label: pathOf(x.key), d: x.clicks - (prevPages.get(x.key) ?? 0) })).filter((x) => x.d > 0)
        .sort((a, b) => b.d - a.d || a.label.localeCompare(b.label)).slice(0, 3);
      if (gains.length) {
        inner += `<div style="height:10px;line-height:10px;font-size:0">&nbsp;</div>${K.h3(R.googlePagesUp)}${K.moves(gains.map((x) => ({ label: x.label, tag: '', text: nf(x.d, 0, true), tone: 'up' })))}`;
        text.push(`  ${R.googlePagesUp} (${R.googlePagesUpHint})`, ...gains.map((x) => `    - ${lv(x.label, nf(x.d, 0, true))}`));
      }
    } else {
      text.push(`  - ${R.googleNothing}`);
    }
    rows.push(K.card(`${K.h2(R.googleTitle, fill(R.googleHint, gv))}${inner}${input.searchUrl ? K.link(input.searchUrl, R.googleLink) : ''}`));
  } else if (g?.status === 'error') {
    rows.push(K.note(R.googleUnavailable));
    text.push('', R.googleUnavailable);
  }

  // YouTube
  const y = input.youtube;
  if (y?.status === 'ok' && y.channel) {
    const yv = { from: shortDate(texts, y.start), to: shortDate(texts, y.end) };
    const site = y.site;
    const subscribers = y.channel.subscribers === null ? '—' : nf(y.channel.subscribers);
    const figs: Figure[] = [
      { value: nf(y.totals.views), label: R.youtubeViews, sub: K.trend(y.totals.views, y.previous.views) },
      { value: nf(y.totals.minutes), label: R.youtubeMinutes, sub: K.trend(y.totals.minutes, y.previous.minutes) },
      { value: subscribers, label: R.youtubeSubscribers, sub: muted(fill(R.youtubeBalance, { gained: nf(y.totals.gained), lost: nf(y.totals.lost) })) },
    ];
    if (site && site.visits !== null) figs.push({ value: nf(site.visits), label: R.youtubeSiteVisits, sub: K.trend(site.visits, site.previousVisits) });
    if (site && site.requests !== null) figs.push({ value: nf(site.requests), label: R.youtubeRequests, sub: K.trend(site.requests, site.previousRequests) });
    const videos = (input.youtubeVideos ?? (input.youtubeTop ? [input.youtubeTop] : [])).filter((v) => v.views > 0);
    const list = videos.length
      ? `<div style="height:10px;line-height:10px;font-size:0">&nbsp;</div>${K.grid([R.youtubeVideos, R.youtubeViews], videos.map((v) => [`<a href="${esc(v.url)}" class="sk-ac" style="color:${C.accentDeep}">${esc(v.title)}</a>`, esc(nf(v.views))]))}`
      : '';
    rows.push(K.card(`${K.h2(R.youtubeTitle, fill(R.youtubeHint, yv))}${K.figures(figs)}${list}${input.youtubeUrl ? K.link(input.youtubeUrl, R.youtubeLink) : ''}`));
    text.push('', `${upper(R.youtubeTitle)} (${fill(texts.periods.short, yv)})`, `  - ${lv(R.youtubeViews, `${nf(y.totals.views)}${t(y.totals.views, y.previous.views)}`)}`,
      `  - ${lv(R.youtubeMinutes, `${nf(y.totals.minutes)}${t(y.totals.minutes, y.previous.minutes)}`)}`, `  - ${lv(R.youtubeSubscribers, subscribers)}`);
    if (site && site.visits !== null) text.push(`  - ${lv(R.youtubeSiteVisits, nf(site.visits))}`);
    if (site && site.requests !== null) text.push(`  - ${lv(R.youtubeRequests, nf(site.requests))}`);
    if (videos.length) text.push(`  ${R.youtubeVideos} (${R.youtubeVideosHint})`, ...videos.map((v) => `    - ${lv(v.title, nf(v.views))} ${v.url}`));
  } else if (y?.status === 'error') {
    rows.push(K.note(R.youtubeUnavailable));
    text.push('', R.youtubeUnavailable);
  }

  // rankings
  const lists: { title: string; rows: [string, number][]; hint?: string }[] = [];
  if (ok) {
    const b = o.breakdowns;
    lists.push({ title: R.pages, rows: top(b.pages, own) });
    lists.push({ title: R.referrers, rows: top(b.referrers, source) });
    lists.push({ title: R.countries, rows: top(b.countries, (i) => countryName(texts, i.key)) });
    lists.push({ title: R.cities, rows: top(b.cities, own) });
    lists.push({ title: R.entries, rows: top(b.entries, own), hint: R.entriesHint });
    lists.push({ title: R.exits, rows: top(b.exits, own), hint: R.exitsHint });
    lists.push({ title: R.events, rows: top(b.events, own), hint: R.eventsHint });
    for (const grp of o.groups) lists.push({ title: grp.title, rows: top(grp.items, own) });
    // browser languages, in visitors ("fr-FR" and "fr" together); the language of the pages viewed apart, in pages
    lists.push({ title: R.languages, rows: top(mergeLanguages(b.languages), (i) => languageName(texts, i.key)), hint: R.languagesHint });
    if (b.siteLanguages.length) lists.push({ title: R.siteLanguages, rows: top(b.siteLanguages, (i) => languageName(texts, i.key)), hint: R.siteLanguagesHint });
    lists.push({ title: R.devices, rows: top(b.devices, (i) => deviceName(texts, i.key)) });
    lists.push({ title: R.browsers, rows: top(b.browsers, (i) => i.label ?? browserName(i.key)) });
  }
  for (const tb of extras?.tables ?? []) lists.push({ title: tb.title, rows: top(tb.items, own), hint: tb.sub ?? '' });
  if (g?.status === 'ok' && g.totals.impressions) {
    lists.push({ title: R.googleCountries, rows: [...g.countries].sort((a, b) => b.impressions - a.impressions).slice(0, 4).map((c) => [countryName(texts, c.key), c.impressions]), hint: R.googleCountriesHint });
  }
  const shown = lists.map((x) => K.list(x.title, x.rows, x.hint));
  rows.push(K.pairs(shown.map((x) => x.inner)));
  for (const x of shown) if (x.text) text.push(x.text.trimEnd());

  // site-specific cards: a light line of figures, then the lines
  for (const blk of input.blocks ?? []) {
    const figures = blk.figures ?? [], lines = blk.lines ?? [];
    const figs = figures.length ? K.figures(figures.map((f) => ({ value: f.value, label: f.label, sub: f.sub ? muted(f.sub) : '' }))) : '';
    rows.push(K.card(`${K.h2(blk.title, blk.hint ?? '')}${figs}${lines.length ? K.bullets(lines) : ''}`));
    text.push('', upper(blk.title), ...figures.map((f) => `  - ${lv(f.label, f.value)}${f.sub ? ` (${f.sub})` : ''}`), ...lines.map((x) => `  - ${x}`));
  }

  if (input.statsUrl) {
    rows.push(K.button(input.statsUrl, R.button));
    text.push('', fill(R.textLink, { url: input.statsUrl }));
  } else if (o.dashboardUrl) {
    rows.push(K.button(o.dashboardUrl, R.dashboardButton));
    text.push('', fill(R.textLink, { url: o.dashboardUrl }));
  }
  if (R.footer) {
    rows.push(K.footer(fill(R.footer, vars)));
    text.push('', fill(R.footer, vars));
  }

  // with figures when there are some; a variable without value ({change} without a previous period) leaves no empty brackets
  const tpl = ok ? (input.weekly ? R.subjectWeekly : R.subject) : (input.weekly ? R.subjectWeeklyEmpty : R.subjectEmpty);
  const subject = fill(tpl, vars).replace(/\s*[(（]\s*[)）]/g, '').replace(/\s+/g, ' ').trim();
  const pre = ok ? headline : fill(R.preheaderEmpty, vars);
  return { subject, html: K.page(subject, pre, rows.join('\n')), text: text.join('\n').replace(/\n{3,}/g, '\n\n') + '\n', attachments };
}
