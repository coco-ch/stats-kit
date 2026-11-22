/*
 * Traffic report by e-mail (weekly or on demand): key figures with trends, goals, site data, world map (attached PNG, "cid:"),
 * page views per day, heatmap, Google, YouTube, rankings. A plain-text version comes with it. Every text comes from the texts
 * of the chosen language; numbers, dates, weekdays and hours are formatted with Intl.
 * The library sends nothing: the message is handed to the site's sending function.
 */
import { bestSlot, browserName, countryName, deviceName, fill, formatDuration, formatNumber, formatPercent, hourName, labelValue, languageName, longDay, percentChange, shortDate, slotLabel, weekdayName, } from 'stats-kit/contract';
import { CARD_INNER, esc, mailKit } from "./mail-kit.js";
import { renderWorldMap } from "./map-png.js";
import { palette, rgb } from "./theme.js";
export const MAP_CID = 'stats-kit-map';
export const LOGO_CID = 'stats-kit-logo';
/** Preview: the attached images are replaced by their content, to be shown outside a mail client. */
export function previewHtml(m) {
    return m.attachments.reduce((html, a) => html.split(`cid:${a.cid}`).join(`data:${a.contentType};base64,${Buffer.from(a.content).toString('base64')}`), m.html);
}
const top = (items, label, n = 6) => (items ?? []).slice(0, n).map((i) => [label(i), i.value]);
export function buildReport(input) {
    const { overview: o, texts, siteName } = input;
    const R = texts.report;
    const C = palette(input.theme);
    const K = mailKit(C, texts);
    const nf = (v, d = 0) => formatNumber(texts, v, d);
    const lv = (label, value) => labelValue(texts, label, value);
    const upper = (s) => s.toLocaleUpperCase(texts.locale);
    const tz = o.range.timeZone;
    const last = new Date(Date.parse(o.range.to) - 1).toISOString();
    const from = shortDate(texts, o.range.from, tz), to = shortDate(texts, last, tz);
    const ok = o.status === 'ok';
    const s = o.totals, p = o.previous;
    const change = ok ? percentChange(s.visitors, p?.visitors) : null;
    // the totals are also available to the subject, the title, the introduction and the footer ({visitors}, {change}…)
    const vars = {
        site: siteName, from, to, period: fill(texts.periods.short, { from, to }), days: o.range.days,
        visitors: ok ? nf(s.visitors) : '', pageviews: ok ? nf(s.pageviews) : '', visits: ok ? nf(s.visits) : '',
        change: change === null ? '' : formatPercent(texts, change / 100, 0, true),
    };
    const attachments = [];
    const rows = [];
    const text = [`${siteName} — ${R.title} (${fill(R.subtitle, vars)})`, ''];
    let logo = '';
    const l = C.logo;
    if (l?.png) {
        attachments.push({ cid: LOGO_CID, filename: 'logo.png', contentType: 'image/png', content: l.png });
        logo = `<img src="cid:${LOGO_CID}" width="${l.width ?? 120}"${l.height ? ` height="${l.height}"` : ''} alt="${esc(l.alt ?? siteName)}" style="display:block;border:0;height:auto">`;
    }
    else if (l?.url) {
        logo = `<img src="${esc(l.url)}" width="${l.width ?? 120}"${l.height ? ` height="${l.height}"` : ''} alt="${esc(l.alt ?? siteName)}" style="display:block;border:0;height:auto">`;
    }
    rows.push(K.header(siteName, R.title, fill(R.subtitle, vars), logo));
    if (R.intro) {
        rows.push(K.paragraph(fill(R.intro, vars)));
        text.push(fill(R.intro, vars), '');
    }
    if (ok) {
        const bounce = formatPercent(texts, s.visits ? s.bounces / s.visits : 0, 0);
        const avg = fill(R.avgDuration, { d: formatDuration(texts, s.visits ? Math.round(s.totaltime / s.visits) : 0) });
        rows.push(K.kpiRow([
            { value: nf(s.visitors), label: R.visitors, sub: K.trend(s.visitors, p?.visitors) },
            { value: nf(s.pageviews), label: R.pageviews, sub: K.trend(s.pageviews, p?.pageviews) },
            { value: nf(s.visits), label: R.visits, sub: K.trend(s.visits, p?.visits) },
            { value: bounce, label: R.bounce, sub: `<span style="color:${C.muted}">${esc(avg)}</span>` },
        ]));
        const t = (n, b) => { const c = percentChange(n, b); return c === null ? '' : `  (${formatPercent(texts, c / 100, 0, true)})`; };
        text.push(lv(R.visitors, `${nf(s.visitors)}${t(s.visitors, p?.visitors)}`), lv(R.pageviews, `${nf(s.pageviews)}${t(s.pageviews, p?.pageviews)}`), lv(R.visits, `${nf(s.visits)}${t(s.visits, p?.visits)}`), lv(R.bounce, `${bounce}, ${avg}`));
        if (o.goals.length) {
            rows.push(K.kpiRow(o.goals.map((g) => ({ value: nf(g.value), label: g.label, sub: K.trend(g.value, g.previous) }))));
            for (const g of o.goals)
                text.push(lv(g.label, `${nf(g.value)}${t(g.value, g.previous)}`));
        }
    }
    else {
        const note = o.status === 'not-configured' ? R.notConfigured : R.unavailable;
        rows.push(K.note(note));
        text.push(note);
    }
    const extras = o.extras;
    if (extras?.tiles.length) {
        const plain = extras.tiles.filter((x) => !x.highlight);
        const strong = extras.tiles.filter((x) => x.highlight);
        const value = (x) => (typeof x.value === 'number' ? nf(x.value) : x.value);
        if (plain.length)
            rows.push(K.kpiRow(plain.map((x) => ({ value: value(x), label: x.label, sub: typeof x.value === 'number' ? K.trend(x.value, x.previous) : x.sub ? esc(x.sub) : '' }))));
        const link = (x) => (x.link ? ` <a href="${esc(x.link.url)}" style="color:${C.accentDeep}">${esc(x.link.label)}</a>` : '');
        for (const x of strong)
            rows.push(K.callout(`<b>${esc(lv(x.label, value(x)))}</b>${x.sub ? ` — ${esc(x.sub)}` : ''}${link(x)}`));
        for (const x of extras.tiles)
            text.push(`${lv(x.label, value(x))}${x.sub ? ` (${x.sub})` : ''}${x.highlight && x.link ? ` ${x.link.url}` : ''}`);
    }
    rows.push('<tr><td style="font-size:0;line-height:8px">&nbsp;</td></tr>');
    const ser = o.series;
    const bestIndex = ser.pageviews.reduce((b, v, i) => (v > ser.pageviews[b] ? i : b), 0);
    const label = (x) => slotLabel(texts, x, ser.unit);
    const bestDay = ok && ser.pageviews[bestIndex] ? fill(R.bestDay, { d: ser.unit === 'day' ? longDay(texts, ser.slots[bestIndex]) : label(ser.slots[bestIndex]), n: nf(ser.pageviews[bestIndex]) }) : '';
    const slot = ok ? bestSlot(o.heatmap) : null;
    const when = slot ? fill(R.slot, { day: weekdayName(texts, slot.day), hour: hourName(texts, slot.hour) }) : '';
    if (ok && input.glance !== false) {
        const b = o.breakdowns;
        const first = (template, items, name) => (items[0]?.value ? fill(template, { label: name(items[0]), n: nf(items[0].value) }) : '');
        const glance = [
            first(R.glanceSource, b.referrers, (i) => i.label ?? (i.key || texts.common.direct)),
            first(R.glanceCountry, b.countries, (i) => countryName(texts, i.key)),
            first(R.glancePage, b.pages, (i) => i.label ?? i.key),
            first(R.glanceEntry, b.entries, (i) => i.label ?? i.key),
            bestDay,
            when && fill(R.glanceSlot, { slot: when }),
        ].filter(Boolean);
        if (glance.length) {
            rows.push(K.card(`${K.h2(R.glanceTitle)}${K.bullets(glance)}`));
            text.push('', upper(R.glanceTitle), ...glance.map((x) => `  - ${x}`));
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
        rows.push(K.card(`${K.h2(R.dailyTitle, bestDay)}${K.bars(ser.pageviews, label(ser.slots[0]), label(ser.slots.at(-1)), titles, prev, [R.dailyCurrent, R.dailyPrevious])}`));
        if (bestDay && input.glance === false)
            text.push('', bestDay);
    }
    if (slot) {
        const days = Array.from({ length: 7 }, (_, d) => weekdayName(texts, d, 'short'));
        rows.push(K.card(`${K.h2(R.heatTitle, fill(R.heatHint, { slot: when, tz }))}${K.heat(o.heatmap, days)}`));
        text.push(fill(R.heatHint, { slot: when, tz }));
    }
    /** Link to a page of the administration, at the end of a block. */
    const pageLink = (url, label) => (url ? `<div style="font:12px ${C.font};margin-top:8px"><a href="${esc(url)}" style="color:${C.accentDeep}">${esc(label)}</a></div>` : '');
    // Google
    const g = input.search;
    if (g?.status === 'ok') {
        const gv = { from: shortDate(texts, g.start), to: shortDate(texts, g.end) };
        const cell = (value, label, sub) => K.kpi(value, label, sub, '33.33%');
        const inner = g.totals.impressions
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cell(nf(g.totals.clicks), R.googleClicks, K.trend(g.totals.clicks, g.previous.clicks))}${cell(nf(g.totals.impressions), R.googleImpressions, K.trend(g.totals.impressions, g.previous.impressions))}${cell(nf(g.totals.position, 1), R.googlePosition, '')}</tr></table>`
            : `<div style="font:13px/1.5 ${C.font};color:${C.muted}">${esc(R.googleNothing)}</div>`;
        rows.push(K.card(`${K.h2(R.googleTitle, fill(R.googleHint, gv))}${inner}${pageLink(input.searchUrl, R.googleLink)}`));
        text.push('', `${upper(R.googleTitle)} (${fill(texts.periods.short, gv)})`, `  - ${lv(R.googleClicks, nf(g.totals.clicks))}`, `  - ${lv(R.googleImpressions, nf(g.totals.impressions))}`, `  - ${lv(R.googlePosition, g.totals.impressions ? nf(g.totals.position, 1) : '—')}`);
    }
    else if (g?.status === 'error') {
        rows.push(K.note(R.googleUnavailable));
        text.push('', R.googleUnavailable);
    }
    // YouTube
    const y = input.youtube;
    if (y?.status === 'ok' && y.channel) {
        const yv = { from: shortDate(texts, y.start), to: shortDate(texts, y.end) };
        const cell = (value, label, sub) => K.kpi(value, label, sub, '33.33%');
        const muted = (x) => `<span style="color:${C.muted}">${esc(x)}</span>`;
        const site = y.site;
        const subscribers = y.channel.subscribers === null ? '—' : nf(y.channel.subscribers);
        const line1 = `<tr>${cell(nf(y.totals.views), R.youtubeViews, K.trend(y.totals.views, y.previous.views))}${cell(nf(y.totals.minutes), R.youtubeMinutes, K.trend(y.totals.minutes, y.previous.minutes))}${cell(subscribers, R.youtubeSubscribers, muted(fill(R.youtubeBalance, { gained: nf(y.totals.gained), lost: nf(y.totals.lost) })))}</tr>`;
        const line2 = site ? `<tr>${cell(site.visits === null ? '—' : nf(site.visits), R.youtubeSiteVisits, site.visits === null ? '' : K.trend(site.visits, site.previousVisits))}${site.requests === null ? '<td width="33.33%"></td>' : cell(nf(site.requests), R.youtubeRequests, K.trend(site.requests, site.previousRequests))}<td width="33.33%"></td></tr>` : '';
        const topV = input.youtubeTop ? `<div style="font:13px/1.5 ${C.font};color:${C.text};margin-top:6px">${esc(fill(R.youtubeTop, { title: '§', n: nf(input.youtubeTop.views) })).replace('§', `<a href="${esc(input.youtubeTop.url)}" style="color:${C.accentDeep}">${esc(input.youtubeTop.title)}</a>`)}</div>` : '';
        rows.push(K.card(`${K.h2(R.youtubeTitle, fill(R.youtubeHint, yv))}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${line1}${line2}</table>${topV}${pageLink(input.youtubeUrl, R.youtubeLink)}`));
        text.push('', `${upper(R.youtubeTitle)} (${fill(texts.periods.short, yv)})`, `  - ${lv(R.youtubeViews, nf(y.totals.views))}`, `  - ${lv(R.youtubeMinutes, nf(y.totals.minutes))}`, `  - ${lv(R.youtubeSubscribers, subscribers)}`);
        if (site?.visits !== null && site?.visits !== undefined)
            text.push(`  - ${lv(R.youtubeSiteVisits, nf(site.visits))}`);
        if (site?.requests !== null && site?.requests !== undefined)
            text.push(`  - ${lv(R.youtubeRequests, nf(site.requests))}`);
        if (input.youtubeTop)
            text.push(`  - ${fill(R.youtubeTop, { title: input.youtubeTop.title, n: nf(input.youtubeTop.views) })} ${input.youtubeTop.url}`);
    }
    else if (y?.status === 'error') {
        rows.push(K.note(R.youtubeUnavailable));
        text.push('', R.youtubeUnavailable);
    }
    // rankings
    const lists = [];
    const own = (i) => i.label ?? i.key;
    if (ok) {
        const b = o.breakdowns;
        lists.push({ title: R.pages, rows: top(b.pages, own) });
        lists.push({ title: R.referrers, rows: top(b.referrers, (i) => i.label ?? (i.key || texts.common.direct)) });
        lists.push({ title: R.countries, rows: top(b.countries, (i) => countryName(texts, i.key)) });
        lists.push({ title: R.cities, rows: top(b.cities, own) });
        lists.push({ title: R.entries, rows: top(b.entries, own), hint: R.entriesHint });
        lists.push({ title: R.exits, rows: top(b.exits, own), hint: R.exitsHint });
        lists.push({ title: R.events, rows: top(b.events, own), hint: R.eventsHint });
        for (const grp of o.groups)
            lists.push({ title: grp.title, rows: top(grp.items, own) });
        lists.push({ title: R.languages, rows: top(b.siteLanguages.length ? b.siteLanguages : b.languages, (i) => languageName(texts, i.key)) });
        lists.push({ title: R.devices, rows: top(b.devices, (i) => deviceName(texts, i.key)) });
        lists.push({ title: R.browsers, rows: top(b.browsers, (i) => i.label ?? browserName(i.key)) });
    }
    for (const t of extras?.tables ?? [])
        lists.push({ title: t.title, rows: top(t.items, own), hint: t.sub ?? '' });
    if (g?.status === 'ok' && g.totals.impressions) {
        lists.push({ title: R.googleQueries, rows: [...g.queries].sort((a, b) => b.impressions - a.impressions).slice(0, 6).map((q) => [q.key, q.impressions]), hint: R.googleQueriesHint });
        lists.push({ title: R.googleCountries, rows: [...g.countries].sort((a, b) => b.impressions - a.impressions).slice(0, 4).map((c) => [countryName(texts, c.key), c.impressions]), hint: R.googleCountriesHint });
    }
    const shown = lists.map((x) => K.list(x.title, x.rows, x.hint));
    rows.push(K.pairs(shown.map((x) => x.inner)));
    for (const x of shown)
        if (x.text)
            text.push(x.text.trimEnd());
    // site-specific cards
    for (const blk of input.blocks ?? []) {
        const figures = blk.figures ?? [], lines = blk.lines ?? [];
        const cells = figures.map((f) => K.kpi(f.value, f.label, f.sub ? `<span style="color:${C.muted}">${esc(f.sub)}</span>` : '', '33.33%'));
        const table = cells.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${Array.from({ length: Math.ceil(cells.length / 3) }, (_, i) => `<tr>${cells.slice(i * 3, i * 3 + 3).join('')}</tr>`).join('')}</table>` : '';
        rows.push(K.card(`${K.h2(blk.title, blk.hint ?? '')}${table}${lines.length ? K.bullets(lines) : ''}`));
        text.push('', upper(blk.title), ...figures.map((f) => `  - ${lv(f.label, f.value)}${f.sub ? ` (${f.sub})` : ''}`), ...lines.map((l) => `  - ${l}`));
    }
    if (input.statsUrl) {
        rows.push(K.button(input.statsUrl, R.button));
        text.push('', fill(R.textLink, { url: input.statsUrl }));
    }
    else if (o.dashboardUrl) {
        rows.push(K.button(o.dashboardUrl, R.dashboardButton));
        text.push('', fill(R.textLink, { url: o.dashboardUrl }));
    }
    if (R.footer) {
        rows.push(K.footer(fill(R.footer, vars)));
        text.push('', fill(R.footer, vars));
    }
    // a variable without value ({change} without a previous period) leaves no empty brackets behind
    const subject = fill(input.weekly ? R.subjectWeekly : R.subject, vars).replace(/\s*\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
    const pre = ok ? fill(R.preheader, { ...vars, visitors: nf(s.visitors), pageviews: nf(s.pageviews) }) : fill(R.preheaderEmpty, vars);
    return { subject, html: K.page(subject, pre, rows.join('\n')), text: text.join('\n').replace(/\n{3,}/g, '\n\n') + '\n', attachments };
}
