/*
 * Rapport de fréquentation par e-mail (hebdomadaire ou à la demande) : chiffres clés avec tendances, objectifs, données du site,
 * carte du monde (PNG joint, « cid: »), pages vues par jour, carte de chaleur, Google, YouTube, classements. Version texte jointe.
 * La librairie n'envoie rien : le message est remis à la fonction d'envoi du site.
 */
import { bestSlot, browserName, countryName, deviceName, fill, formatDuration, formatNumber, languageName, longDay, percentChange, shortDate, slotLabel, } from 'stats-kit/contrat';
import { CARD_INNER, esc, mailKit } from "./kit.js";
import { renderWorldMap } from "./carte-png.js";
import { palette, rgb } from "./theme.js";
import { mixHex } from 'stats-kit/contrat';
export const MAP_CID = 'stats-kit-carte';
export const LOGO_CID = 'stats-kit-logo';
/** Aperçu : les images jointes sont remplacées par leur contenu, pour s'afficher hors d'une messagerie. */
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
    const tz = o.range.timeZone;
    const last = new Date(Date.parse(o.range.to) - 1).toISOString();
    const from = shortDate(texts, o.range.from, tz), to = shortDate(texts, last, tz);
    const vars = { site: siteName, from, to, period: `${from} – ${to}`, days: o.range.days };
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
    const ok = o.status === 'ok';
    const s = o.totals, p = o.previous;
    if (ok) {
        const bounce = s.visits ? Math.round((s.bounces / s.visits) * 100) : 0;
        const avg = s.visits ? Math.round(s.totaltime / s.visits) : 0;
        rows.push(K.kpiRow([
            { value: nf(s.visitors), label: R.visitors, sub: K.trend(s.visitors, p?.visitors) },
            { value: nf(s.pageviews), label: R.pageviews, sub: K.trend(s.pageviews, p?.pageviews) },
            { value: nf(s.visits), label: R.visits, sub: K.trend(s.visits, p?.visits) },
            { value: `${bounce} %`, label: R.bounce, sub: `<span style="color:${C.muted}">${esc(fill(R.avgDuration, { d: formatDuration(avg) }))}</span>` },
        ]));
        const t = (n, b) => { const c = percentChange(n, b); return c === null ? '' : `  (${c > 0 ? '+' : ''}${c} %)`; };
        text.push(`${R.visitors} : ${nf(s.visitors)}${t(s.visitors, p?.visitors)}`, `${R.pageviews} : ${nf(s.pageviews)}${t(s.pageviews, p?.pageviews)}`, `${R.visits} : ${nf(s.visits)}${t(s.visits, p?.visits)}`, `${R.bounce} : ${bounce} %, ${fill(R.avgDuration, { d: formatDuration(avg) })}`);
        if (o.goals.length) {
            rows.push(K.kpiRow(o.goals.map((g) => ({ value: nf(g.value), label: g.label, sub: K.trend(g.value, g.previous) }))));
            for (const g of o.goals)
                text.push(`${g.label} : ${nf(g.value)}${t(g.value, g.previous)}`);
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
        if (plain.length)
            rows.push(K.kpiRow(plain.map((x) => ({ value: typeof x.value === 'number' ? nf(x.value) : x.value, label: x.label, sub: typeof x.value === 'number' ? K.trend(x.value, x.previous) : x.sub ? esc(x.sub) : '' }))));
        for (const x of strong)
            rows.push(K.callout(`<b>${esc(x.label)} : ${esc(typeof x.value === 'number' ? nf(x.value) : x.value)}</b>${x.sub ? ` — ${esc(x.sub)}` : ''}`));
        for (const x of extras.tiles)
            text.push(`${x.label} : ${typeof x.value === 'number' ? nf(x.value) : x.value}${x.sub ? ` (${x.sub})` : ''}`);
    }
    rows.push('<tr><td style="font-size:0;line-height:8px">&nbsp;</td></tr>');
    if (ok && input.world && o.breakdowns.countries.length) {
        const lo = rgb(mixHex(C.brand, '#ffffff', 0.65)), hi = rgb(C.brand);
        const map = renderWorldMap(o.breakdowns.countries, input.world, { background: rgb(mixHex(C.brand, '#ffffff', 0.94)), land: rgb(mixHex(C.brand, '#d9dce4', 0.86)), border: [255, 255, 255], low: lo, high: hi });
        attachments.push({ cid: MAP_CID, filename: 'carte.png', contentType: 'image/png', content: map.png });
        rows.push(K.card(`${K.h2(R.mapTitle, R.mapHint)}<img src="cid:${MAP_CID}" width="${CARD_INNER}" alt="${esc(R.mapAlt)}" style="display:block;width:100%;max-width:${CARD_INNER}px;height:auto;border-radius:10px;border:0">`));
    }
    if (ok && o.series.slots.length > 1) {
        const ser = o.series;
        const best = ser.pageviews.reduce((b, v, i) => (v > ser.pageviews[b] ? i : b), 0);
        const hint = ser.pageviews[best] ? fill(R.bestDay, { d: ser.unit === 'day' ? longDay(texts, ser.slots[best]) : slotLabel(texts, ser.slots[best], 'hour'), n: nf(ser.pageviews[best]) }) : '';
        const label = (slot) => slotLabel(texts, slot, ser.unit);
        rows.push(K.card(`${K.h2(R.dailyTitle, hint)}${K.bars(ser.pageviews, label(ser.slots[0]), label(ser.slots.at(-1)), ser.slots.map((x, i) => `${label(x)} : ${ser.pageviews[i]}`))}`));
        if (hint)
            text.push('', hint);
    }
    const slot = ok ? bestSlot(o.heatmap) : null;
    if (slot) {
        const when = fill(R.slot, { day: texts.weekdays[slot.day], hour: slot.hour });
        rows.push(K.card(`${K.h2(R.heatTitle, fill(R.heatHint, { slot: when, tz }))}${K.heat(o.heatmap)}`));
        text.push(fill(R.heatHint, { slot: when, tz }));
    }
    // Google
    const g = input.search;
    if (g?.status === 'ok') {
        const gv = { from: shortDate(texts, g.start), to: shortDate(texts, g.end) };
        const cell = (value, label, sub) => K.kpi(value, label, sub, '33.33%');
        const inner = g.totals.impressions
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cell(nf(g.totals.clicks), R.googleClicks, K.trend(g.totals.clicks, g.previous.clicks))}${cell(nf(g.totals.impressions), R.googleImpressions, K.trend(g.totals.impressions, g.previous.impressions))}${cell(nf(g.totals.position, 1), R.googlePosition, '')}</tr></table>`
            : `<div style="font:13px/1.5 ${C.font};color:${C.muted}">${esc(R.googleNothing)}</div>`;
        rows.push(K.card(`${K.h2(R.googleTitle, fill(R.googleHint, gv))}${inner}`));
        text.push('', `${R.googleTitle.toUpperCase()} (${gv.from} – ${gv.to})`, `  - ${R.googleClicks} : ${nf(g.totals.clicks)}`, `  - ${R.googleImpressions} : ${nf(g.totals.impressions)}`, `  - ${R.googlePosition} : ${g.totals.impressions ? nf(g.totals.position, 1) : '—'}`);
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
        const line1 = `<tr>${cell(nf(y.totals.views), R.youtubeViews, K.trend(y.totals.views, y.previous.views))}${cell(nf(y.totals.minutes), R.youtubeMinutes, K.trend(y.totals.minutes, y.previous.minutes))}${cell(y.channel.subscribers === null ? '—' : nf(y.channel.subscribers), R.youtubeSubscribers, muted(fill(R.youtubeBalance, { gained: y.totals.gained, lost: y.totals.lost })))}</tr>`;
        const line2 = site ? `<tr>${cell(site.visits === null ? '—' : nf(site.visits), R.youtubeSiteVisits, site.visits === null ? '' : K.trend(site.visits, site.previousVisits))}${site.requests === null ? '<td width="33.33%"></td>' : cell(nf(site.requests), R.youtubeRequests, K.trend(site.requests, site.previousRequests))}<td width="33.33%"></td></tr>` : '';
        const topV = input.youtubeTop ? `<div style="font:13px/1.5 ${C.font};color:${C.text};margin-top:6px">${esc(fill(R.youtubeTop, { title: '§', n: nf(input.youtubeTop.views) })).replace('§', `<a href="${esc(input.youtubeTop.url)}" style="color:${C.accentDeep}">${esc(input.youtubeTop.title)}</a>`)}</div>` : '';
        rows.push(K.card(`${K.h2(R.youtubeTitle, fill(R.youtubeHint, yv))}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${line1}${line2}</table>${topV}`));
        text.push('', `${R.youtubeTitle.toUpperCase()} (${yv.from} – ${yv.to})`, `  - ${R.youtubeViews} : ${nf(y.totals.views)}`, `  - ${R.youtubeMinutes} : ${nf(y.totals.minutes)}`, `  - ${R.youtubeSubscribers} : ${y.channel.subscribers ?? '—'}`);
        if (site?.visits !== null && site?.visits !== undefined)
            text.push(`  - ${R.youtubeSiteVisits} : ${nf(site.visits)}`);
        if (site?.requests !== null && site?.requests !== undefined)
            text.push(`  - ${R.youtubeRequests} : ${nf(site.requests)}`);
        if (input.youtubeTop)
            text.push(`  - ${fill(R.youtubeTop, { title: input.youtubeTop.title, n: input.youtubeTop.views })} ${input.youtubeTop.url}`);
    }
    else if (y?.status === 'error') {
        rows.push(K.note(R.youtubeUnavailable));
        text.push('', R.youtubeUnavailable);
    }
    // classements
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
    if (g?.status === 'ok' && g.totals.impressions)
        lists.push({ title: R.googleQueries, rows: [...g.queries].sort((a, b) => b.impressions - a.impressions).slice(0, 6).map((q) => [q.key, q.impressions]), hint: R.googleQueriesHint });
    const shown = lists.map((x) => K.list(x.title, x.rows, x.hint));
    rows.push(K.pairs(shown.map((x) => x.inner)));
    for (const x of shown)
        if (x.text)
            text.push(x.text.trimEnd());
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
    const subject = fill(input.weekly ? R.subjectWeekly : R.subject, vars).replace(/\s+/g, ' ').trim();
    const pre = ok ? fill(R.preheader, { ...vars, visitors: nf(s.visitors), pageviews: nf(s.pageviews) }) : fill(R.preheaderEmpty, vars);
    return { subject, html: K.page(subject, pre, rows.join('\n')), text: text.join('\n').replace(/\n{3,}/g, '\n\n') + '\n', attachments };
}
