/*
 * HTML building blocks of the e-mail report: tables and inline styles only (Outlook shows neither SVG, nor JavaScript, nor most
 * modern CSS). Usable width: 760 px. Every visible text comes from the texts of the chosen language.
 *
 * Two additions read by the clients that support a style sheet (Apple Mail, iOS, Gmail, Outlook.com, Outlook for Mac…), and
 * ignored without harm by the others:
 *  - under 600 px, key figures two by two and cards on a single column (classes `sk-q`, `sk-col`, `sk-px`, `sk-in`);
 *  - in dark mode, dark backgrounds and light texts (classes `sk-bg`, `sk-card`, `sk-ink`…; `[data-ogsc]` for Outlook.com).
 * A client that inverts the colours itself (Gmail apps, Outlook) gets plain colours on plain backgrounds, which it inverts well,
 * and images on a transparent background.
 */
import { fill, formatNumber, formatPercent, labelValue, mixHex, percentChange } from 'stats-kit/contract';
/** Width of the message, in pixels. */
export const MAIL_WIDTH = 760;
/** Usable width of a full-width card (margins and border removed). */
export const CARD_INNER = MAIL_WIDTH - 2 * 24 - 2 * 18 - 2;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Escaped text, line breaks kept. */
export const escLines = (s) => esc(s).replace(/\n/g, '<br>');
const T = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';
export function mailKit(C, texts) {
    const D = C.dark;
    /** Class of a text colour (dark mode). */
    const role = (color) => (color === C.ink ? 'sk-ink' : color === C.text ? 'sk-tx' : color === C.muted ? 'sk-mu' : color === C.accentDeep ? 'sk-ac' : color === C.up ? 'sk-up' : color === C.down ? 'sk-dn' : '');
    /** `class` and `style` attributes of a text: size ("13px" or "13px/1.5"), weight, colour, font; `more`: other styles. */
    const ts = (size, weight = 400, color = C.text, family = C.font, more = '', extraClass = '') => {
        const cls = [role(color), extraClass].filter(Boolean).join(' ');
        const [px, lh] = size.split('/');
        // the text font is inherited from the card (set once per card: lighter message); only another font is repeated
        const font = family === C.font ? `font-size:${px}${lh ? `;line-height:${lh}` : ''}${weight === 400 ? '' : `;font-weight:${weight}`}` : `font:${weight} ${size} ${family}`;
        return `${cls ? `class="${cls}" ` : ''}style="${font};color:${color}${more ? `;${more}` : ''}"`;
    };
    /** Change shown under a figure: arrow, text, tone; "vs previous period" after it. */
    const delta = (text, tone, arrow) => {
        const color = tone === 'up' ? C.up : tone === 'down' ? C.down : C.muted;
        return `<span class="${role(color)}" style="color:${color};font-weight:700">${arrow} ${esc(text)}</span> <span class="sk-mu" style="color:${C.muted}">${esc(texts.report.vsPrevious)}</span>`;
    };
    /** Relative change (whole percentage); `lowerIsBetter` for a figure that should go down. */
    const trend = (now, before, lowerIsBetter = false) => {
        const p = percentChange(now, before);
        if (p === null)
            return '&nbsp;';
        if (p === 0)
            return delta(formatPercent(texts, 0, 0), 'flat', '=');
        const good = lowerIsBetter ? p < 0 : p > 0;
        return delta(formatPercent(texts, p / 100, 0, true), good ? 'up' : 'down', p >= 0 ? '▲' : '▼');
    };
    /** Absolute change (rounded to `digits`), with a unit template ("{n} pts"); `lowerIsBetter` for a rate of bounces, a position. */
    const gap = (now, before, digits, unit, lowerIsBetter) => {
        if (before === null || before === undefined || !Number.isFinite(before))
            return '&nbsp;';
        const f = 10 ** digits;
        const d = Math.round((now - before) * f) / f;
        const n = (v, signed) => { const s = formatNumber(texts, v, digits, signed); return unit ? fill(unit, { n: s }) : s; };
        if (d === 0)
            return delta(n(0, false), 'flat', '=');
        const good = lowerIsBetter ? d < 0 : d > 0;
        return delta(n(d, true), good ? 'up' : 'down', d > 0 ? '▲' : '▼');
    };
    const box = (inner) => `<table ${T} class="sk-card" style="background:${C.card};border:1px solid ${C.line};border-radius:14px"><tr><td class="sk-in" style="padding:18px;font-family:${C.font}">${inner}</td></tr></table>`;
    const card = (inner) => `<tr><td class="sk-px" style="padding:0 24px 16px 24px">${box(inner)}</td></tr>`;
    /** Two cards side by side (a single one if the number is odd); one above the other on a phone. */
    const row = (cells) => cells.length === 1
        ? card(cells[0])
        : `<tr><td class="sk-px sk-pr" style="padding:0 20px 16px 20px"><table ${T}><tr>${cells.map((c) => `<td class="sk-col" width="50%" valign="top" style="padding:0 4px">${box(c)}</td>`).join('')}</tr></table></td></tr>`;
    const pairs = (cells) => {
        const list = cells.filter(Boolean);
        return Array.from({ length: Math.ceil(list.length / 2) }, (_, i) => row(list.slice(i * 2, i * 2 + 2))).join('\n');
    };
    /** Two blocks side by side inside a card (one above the other on a phone). */
    const split = (a, b) => `<table ${T}><tr><td class="sk-col" width="50%" valign="top" style="padding:0 10px 0 0">${a}</td><td class="sk-col" width="50%" valign="top" style="padding:0 0 0 10px">${b}</td></tr></table>`;
    const h2 = (title, hint = '') => `<div ${ts('15px', 700, C.ink, C.font, 'letter-spacing:-0.01em')}>${esc(title)}</div>${hint ? `<div ${ts('12px', 400, C.muted, C.font, 'margin-top:2px')}>${esc(hint)}</div>` : ''}<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>`;
    const h3 = (title) => `<div ${ts('12px', 700, C.muted, C.font, 'text-transform:uppercase;letter-spacing:0.08em;padding:6px 0 2px')}>${esc(title)}</div>`;
    /** Small chart of a figure (attached PNG, shown at half its size). */
    const spark = (cid, width, height) => `<img src="cid:${cid}" width="${width / 2}" height="${height / 2}" alt="" style="display:block;width:100%;max-width:${width / 2}px;height:auto;border:0;margin-top:8px">`;
    const kpi = (f, width) => `<td class="sk-q" width="${width}" valign="top" style="padding:0 4px 8px"><table ${T} class="sk-card" style="background:${C.card};border:1px solid ${C.line};border-radius:12px"><tr><td style="padding:14px 14px 12px;font-family:${C.font}"><div ${ts('28px/1.1', 800, C.ink, C.display, 'letter-spacing:-0.03em', 'sk-fig')}>${esc(f.value)}</div><div ${ts('12px', 400, C.muted, C.font, 'margin-top:2px')}>${esc(f.label)}</div><div ${ts('11px/1.45', 400, C.text, C.font, 'margin-top:6px;min-height:14px')}>${f.sub}</div>${f.image ?? ''}</td></tr></table></td>`;
    /** Row of key figures, completed to keep cards of the same width; two by two on a phone. */
    const kpiRow = (kpis, columns = 4) => {
        const width = `${(100 / columns).toFixed(2)}%`;
        const cells = kpis.map((k) => kpi(k, width));
        while (cells.length % columns)
            cells.push(`<td class="sk-q" width="${width}"></td>`);
        const rows = [];
        for (let i = 0; i < cells.length; i += columns)
            rows.push(`<tr><td class="sk-px" style="padding:0 20px"><table ${T}><tr>${cells.slice(i, i + columns).join('')}</tr></table></td></tr>`);
        return rows.join('');
    };
    /** Light row of figures inside a card: no frame, a line of figures (two by two on a phone). */
    const figures = (list, columns = 3) => {
        const width = `${(100 / columns).toFixed(2)}%`;
        const cell = (f) => `<td class="sk-q" width="${width}" valign="top" style="padding:4px 12px 8px 0"><div ${ts('20px/1.2', 800, C.ink, C.display, 'letter-spacing:-0.02em')}>${esc(f.value)}</div><div ${ts('12px/1.4', 400, C.muted, C.font, 'margin-top:2px')}>${esc(f.label)}</div>${f.sub ? `<div ${ts('11px/1.45', 400, C.text, C.font, 'margin-top:3px')}>${f.sub}</div>` : ''}</td>`;
        const rows = [];
        for (let i = 0; i < list.length; i += columns) {
            const part = list.slice(i, i + columns).map(cell);
            while (part.length < columns)
                part.push(`<td class="sk-q" width="${width}"></td>`);
            rows.push(`<tr>${part.join('')}</tr>`);
        }
        return `<table ${T}>${rows.join('')}</table>`;
    };
    /** Ranking: label and number, proportional bar below. */
    const list = (title, rows, hint = '') => {
        if (!rows.length)
            return { inner: '', text: '' };
        const max = Math.max(1, ...rows.map((r) => r[1]));
        const html = rows.map(([label, n]) => {
            const w = Math.min(100, Math.max(4, Math.round((n / max) * 100)));
            return `<tr><td ${ts('13px', 400, C.text, C.font, 'padding-top:7px')}>${esc(label)}</td><td align="right" ${ts('13px', 700, C.ink, C.font, 'padding-top:7px;padding-left:8px')}>${esc(formatNumber(texts, n))}</td></tr><tr><td colspan="2" style="padding-top:3px"><table ${T} style="font-size:0;line-height:0"><tr><td width="${w}%" height="6" bgcolor="${C.accent}" style="border-radius:3px">&nbsp;</td>${w < 100 ? '<td>&nbsp;</td>' : ''}</tr></table></td></tr>`;
        });
        return {
            inner: `${h2(title, hint)}<table ${T}>${html.join('')}</table>`,
            text: `\n${title.toLocaleUpperCase(texts.locale)}\n${rows.map(([l, n]) => `  - ${labelValue(texts, l, formatNumber(texts, n))}`).join('\n')}\n`,
        };
    };
    /** Table with a label column and number columns (HTML already escaped in the cells). */
    const grid = (head, rows) => {
        const th = head.map((h, i) => `<td${i ? ' align="right"' : ''} ${ts('11px', 700, C.muted, C.font, `padding:0 ${i ? '0 4px 8px' : '0 4px 0'}`)}>${esc(h)}</td>`).join('');
        const tr = rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' align="right"' : ''} ${ts('13px/1.4', i ? 700 : 400, i ? C.ink : C.text, C.font, `padding:6px ${i ? '0 0 8px' : '0 0 0'};border-top:1px solid ${C.line}`, 'sk-bd')}>${c}</td>`).join('')}</tr>`).join('');
        return `<table ${T}><tr>${th}</tr>${tr}</table>`;
    };
    /** Lines with a change at the right ("+12" in green, "-3" in red); `tag`: small grey word after the label. */
    const moves = (rows) => `<table ${T}>${rows.map((r) => {
        const color = r.tone === 'up' ? C.up : r.tone === 'down' ? C.down : C.muted;
        return `<tr><td ${ts('13px/1.4', 400, C.text, C.font, `padding:6px 0;border-top:1px solid ${C.line}`, 'sk-bd')}>${esc(r.label)}${r.tag ? ` <span ${ts('11px', 400, C.muted)}>· ${esc(r.tag)}</span>` : ''}</td><td align="right" valign="top" ${ts('13px/1.4', 700, color, C.font, `padding:6px 0 6px 8px;border-top:1px solid ${C.line};white-space:nowrap`, 'sk-bd')}>${esc(r.text)}</td></tr>`;
    }).join('')}</table>`;
    /**
     * Vertical bars (one per slot), first and last labels below. With `previous` (same length), each slot shows the bar of the
     * previous period next to it, lighter, and a legend (`legend`: labels of the period and of the previous period).
     */
    const bars = (values, first, last, titles, previous, legend) => {
        const prev = previous && previous.length === values.length ? previous : null;
        const max = Math.max(1, ...values, ...(prev ?? []));
        const H = 110;
        const ghost = mixHex(C.line, C.muted, 0.25);
        // `sk-b1` / `sk-b0`: bars of the period and of the previous period, lighter in dark mode
        const bar = (v, color, cls) => `<td valign="bottom" style="padding:0"><table ${T} style="font-size:0;line-height:0"><tr><td class="${cls}" height="${Math.max(2, Math.round((v / max) * H))}" bgcolor="${color}" style="border-radius:3px 3px 0 0">&nbsp;</td></tr></table></td>`;
        const cells = values.map((v, i) => `<td valign="bottom" style="padding:0 1px" title="${esc(titles[i])}"><table ${T}><tr>${prev ? bar(prev[i], ghost, 'sk-b0') : ''}${bar(v, C.accentDeep, 'sk-b1')}</tr></table></td>`);
        // legend: one line per series, the swatch kept square whatever the width
        const item = (color, cls, text) => `<tr><td width="10" style="padding:3px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:0;line-height:0"><tr><td class="${cls}" width="10" height="10" bgcolor="${color}">&nbsp;</td></tr></table></td><td ${ts('11px/1.3', 400, C.muted, C.font, 'padding:3px 0 3px 6px')}>${esc(text)}</td></tr>`;
        const key = prev && legend
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${item(C.accentDeep, 'sk-b1', legend[0])}${item(ghost, 'sk-b0', legend[1])}</table>`
            : '';
        return `<table ${T} height="${H}"><tr>${cells.join('')}</tr></table><table ${T} style="margin-top:6px"><tr><td ${ts('11px', 400, C.muted)}>${esc(first)}</td><td align="right" ${ts('11px', 400, C.muted)}>${esc(last)}</td></tr></table>${key}`;
    };
    /** Bulleted lines (already formatted texts). */
    const bullets = (lines) => `<table ${T}>${lines.map((l) => `<tr><td width="14" valign="top" ${ts('13px', 400, C.accentDeep, C.font, 'padding:4px 0')}>●</td><td ${ts('13px/1.5', 400, C.text, C.font, 'padding:4px 0')}>${esc(l)}</td></tr>`).join('')}</table>`;
    /** 7 × 24 heatmap; `days` are the short weekday names, Monday first. */
    const heat = (gridValues, days) => {
        const max = Math.max(1, ...gridValues.flat());
        const head = `<tr><td width="4%"></td>${Array.from({ length: 24 }, (_, h) => `<td width="4%" align="center" ${ts('9px/1.4', 400, C.muted)}>${h % 3 === 0 ? esc(formatNumber(texts, h)) : ''}</td>`).join('')}</tr>`;
        // the cells are only coloured (the heatmap has 168 of them): gaps from the table spacing, height on the row; an empty cell
        // (`sk-he`) stays a little lighter than the card in dark mode, so that the grid reads
        const rows = gridValues.map((r, d) => `<tr style="height:15px"><td ${ts('10px', 400, C.muted, C.font, 'padding-right:4px;line-height:1')}>${esc(days[d])}</td>${r.map((y) => y
            ? `<td bgcolor="${mixHex(C.soft, C.accentDeep, 0.15 + 0.85 * (y / max))}">&nbsp;</td>`
            : `<td class="sk-he" bgcolor="${C.page}">&nbsp;</td>`).join('')}</tr>`);
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="2" border="0" style="font-size:0;line-height:0">${head}${rows.join('')}</table>`;
    };
    const button = (href, label) => `<tr><td align="center" style="padding:8px 24px 8px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.accentDeep}" style="background:${C.accentDeep};border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font:700 14px ${C.font};color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table></td></tr>`;
    const header = (eyebrow, title, subtitle, logo) => `<tr><td class="sk-px" style="padding:0 24px 16px 24px"><table ${T} bgcolor="${C.head}" style="background:${C.head};border-radius:16px"><tr><td class="sk-in" style="padding:26px 28px">${logo ? `<div style="margin-bottom:14px">${logo}</div>` : ''}<div style="font:700 12px ${C.font};color:${C.eyebrow};letter-spacing:0.14em;text-transform:uppercase">${esc(eyebrow)}</div><div class="sk-h1" style="font:800 26px/1.2 ${C.display};color:${C.headText};margin-top:8px;letter-spacing:-0.02em">${esc(title)}</div><div style="font:400 14px/1.45 ${C.font};color:${C.headMuted};margin-top:6px">${esc(subtitle)}</div></td></tr></table></td></tr>`;
    /** Sentence that sums up the period, large, under the header. */
    const headline = (text) => `<tr><td class="sk-px" style="padding:0 24px 16px"><table ${T} class="sk-soft" bgcolor="${C.soft}" style="background:${C.soft};border-radius:12px"><tr><td style="padding:14px 18px;border-left:4px solid ${C.accentDeep};border-radius:12px;font-family:${C.font}"><div ${ts('17px/1.45', 700, C.ink, C.display)}>${esc(text)}</div></td></tr></table></td></tr>`;
    const note = (text) => `<tr><td class="sk-px" ${ts('13px/1.5', 400, C.muted, C.font, `padding:0 24px 16px;font-family:${C.font}`)}>${esc(text)}</td></tr>`;
    /** Highlighted site data (requests to handle…), in amber: `sk-warn` / `sk-wi` in dark mode. */
    const callout = (html) => `<tr><td class="sk-px" style="padding:0 24px 16px"><table ${T} class="sk-warn" bgcolor="${C.warnSoft}" style="background:${C.warnSoft};border-radius:12px"><tr><td ${ts('14px/1.5', 400, C.warnInk, C.font, `padding:14px 16px;font-family:${C.font}`, 'sk-wi')}>${html}</td></tr></table></td></tr>`;
    const paragraph = (text) => `<tr><td class="sk-px" ${ts('15px/1.6', 400, C.ink, C.font, `padding:0 24px 16px;font-family:${C.font}`)}>${escLines(text)}</td></tr>`;
    const footer = (text) => `<tr><td align="center" class="sk-px" ${ts('12px/1.6', 400, C.muted, C.font, `padding:14px 24px 0;font-family:${C.font}`)}>${escLines(text)}</td></tr>`;
    /** Link to a page of the administration, at the end of a block. */
    const link = (url, label) => `<div style="font:12px ${C.font};margin-top:10px"><a href="${esc(url)}" class="sk-ac" style="color:${C.accentDeep}">${esc(label)}</a></div>`;
    /** Style sheet: phone layout and dark mode (clients that read it; the others keep the inline styles). */
    const css = () => {
        const dark = `.sk-bg{background:${D.page}!important;background-color:${D.page}!important}.sk-card{background:${D.card}!important;background-color:${D.card}!important;border-color:${D.line}!important}.sk-soft{background:${D.soft}!important;background-color:${D.soft}!important}.sk-ink{color:${D.ink}!important}.sk-tx{color:${D.text}!important}.sk-mu{color:${D.muted}!important}.sk-ac{color:${D.accent}!important}.sk-up{color:${D.up}!important}.sk-dn{color:${D.down}!important}.sk-bd{border-color:${D.line}!important}.sk-he{background:${mixHex(D.card, '#ffffff', 0.08)}!important;background-color:${mixHex(D.card, '#ffffff', 0.08)}!important}.sk-warn{background:#3a2f16!important;background-color:#3a2f16!important}.sk-wi{color:#ffd98c!important}.sk-b1{background:${D.accent}!important;background-color:${D.accent}!important}.sk-b0{background:${mixHex(D.line, D.muted, 0.4)}!important;background-color:${mixHex(D.line, D.muted, 0.4)}!important}`;
        const ogsc = dark.replace(/\.sk-/g, '[data-ogsc] .sk-');
        return `<style>:root{color-scheme:light dark;supported-color-schemes:light dark}@media only screen and (max-width:600px){.sk-px{padding-left:10px!important;padding-right:10px!important}.sk-in{padding:14px!important}.sk-q{display:inline-block!important;width:50%!important;box-sizing:border-box}.sk-col{display:block!important;width:100%!important;box-sizing:border-box;padding:0 0 12px 0!important}.sk-pr{padding-bottom:4px!important}.sk-h1{font-size:22px!important}.sk-fig{font-size:24px!important}}@media (prefers-color-scheme:dark){${dark}}${ogsc}</style>`;
    };
    /** Complete document: `rows` = <tr> rows already assembled. */
    const page = (title, preheader, rows) => `<!doctype html><html lang="${esc(texts.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="x-apple-disable-message-reformatting"><title>${esc(title)}</title>
${css()}
<!--[if mso]><style>table{border-collapse:collapse}td{font-family:Arial,sans-serif}</style><![endif]--></head>
<body class="sk-bg" style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.page}">${esc(preheader)}${'&#8199;&#65279;&#847; '.repeat(40)}</div>
<table ${T} class="sk-bg" bgcolor="${C.page}" style="background:${C.page}"><tr><td align="center" style="padding:24px 8px">
<!--[if mso]><table role="presentation" width="${MAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="${MAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${MAIL_WIDTH}px">
${rows}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
    return { trend, gap, delta, box, card, row, pairs, split, h2, h3, spark, kpi, kpiRow, figures, list, grid, moves, bars, bullets, heat, button, header, headline, note, callout, paragraph, footer, link, page, fill, ts };
}
export { fill };
