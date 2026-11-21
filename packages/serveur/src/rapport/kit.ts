/*
 * Briques HTML du rapport par e-mail : tableaux et styles en ligne uniquement (Outlook n'affiche ni SVG, ni JavaScript, ni la
 * plupart des CSS modernes). Largeur utile : 760 px.
 */
import { fill, percentChange, type Texts } from 'stats-kit/contrat';
import { mixHex } from 'stats-kit/contrat';
import type { Palette } from './theme.ts';

/** Largeur du message, en pixels. */
export const MAIL_WIDTH = 760;
/** Largeur utile d'une carte pleine largeur (marges et bordure déduites). */
export const CARD_INNER = MAIL_WIDTH - 2 * 24 - 2 * 18 - 2;

export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Texte échappé, retours à la ligne conservés. */
export const escLines = (s: string): string => esc(s).replace(/\n/g, '<br>');

const T = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

export function mailKit(C: Palette, texts: Texts) {
  const font = (size: string, weight = 400, color = C.text, family = C.font) => `font:${weight} ${size} ${family};color:${color}`;

  const trend = (now: number, before: number | null | undefined): string => {
    const p = percentChange(now, before);
    if (p === null) return '&nbsp;';
    return `<span style="color:${p >= 0 ? C.up : C.down};font-weight:700">${p >= 0 ? '▲' : '▼'} ${p > 0 ? '+' : ''}${p} %</span> <span style="color:${C.muted}">${esc(texts.report.vsPrevious)}</span>`;
  };

  const box = (inner: string) => `<table ${T} style="background:${C.card};border:1px solid ${C.line};border-radius:14px"><tr><td style="padding:18px">${inner}</td></tr></table>`;
  const card = (inner: string) => `<tr><td style="padding:0 24px 16px 24px">${box(inner)}</td></tr>`;
  /** Deux cartes côte à côte (une seule si le nombre est impair). */
  const row = (cells: string[]) => cells.length === 1
    ? card(cells[0])
    : `<tr><td style="padding:0 20px 16px 20px"><table ${T}><tr>${cells.map((c) => `<td width="50%" valign="top" style="padding:0 4px">${box(c)}</td>`).join('')}</tr></table></td></tr>`;
  const pairs = (cells: string[]) => {
    const list = cells.filter(Boolean);
    return Array.from({ length: Math.ceil(list.length / 2) }, (_, i) => row(list.slice(i * 2, i * 2 + 2))).join('\n');
  };

  const h2 = (title: string, hint = '') =>
    `<div style="${font('15px', 700, C.ink)};letter-spacing:-0.01em">${esc(title)}</div>${hint ? `<div style="${font('12px', 400, C.muted)};margin-top:2px">${esc(hint)}</div>` : ''}<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>`;

  const kpi = (value: string, label: string, sub: string, width: string) =>
    `<td width="${width}" valign="top" style="padding:0 4px 8px"><table ${T} style="background:${C.card};border:1px solid ${C.line};border-radius:12px"><tr><td style="padding:14px 14px 12px"><div style="${font('28px/1.1', 800, C.ink, C.display)};letter-spacing:-0.03em">${esc(value)}</div><div style="${font('12px', 400, C.muted)};margin-top:2px">${esc(label)}</div><div style="${font('11px')};margin-top:6px;min-height:14px">${sub}</div></td></tr></table></td>`;

  /** Ligne de chiffres clés, complétée pour garder des cartes de même largeur. */
  const kpiRow = (kpis: { value: string; label: string; sub: string }[], columns = 4) => {
    const width = `${(100 / columns).toFixed(2)}%`;
    const cells = kpis.map((k) => kpi(k.value, k.label, k.sub, width));
    while (cells.length % columns) cells.push(`<td width="${width}"></td>`);
    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += columns) rows.push(`<tr><td style="padding:0 20px"><table ${T}><tr>${cells.slice(i, i + columns).join('')}</tr></table></td></tr>`);
    return rows.join('');
  };

  /** Classement : libellé et nombre, barre proportionnelle dessous. */
  const list = (title: string, rows: [string, number][], hint = '') => {
    if (!rows.length) return { inner: '', text: '' };
    const max = Math.max(1, ...rows.map((r) => r[1]));
    const html = rows.map(([label, n]) => {
      const w = Math.min(100, Math.max(4, Math.round((n / max) * 100)));
      return `<tr><td style="padding-top:7px;${font('13px')}">${esc(label)}</td><td align="right" style="padding-top:7px;${font('13px', 700, C.ink)}">${esc(n.toLocaleString(texts.locale))}</td></tr><tr><td colspan="2" style="padding-top:3px"><table ${T}><tr><td width="${w}%" height="6" bgcolor="${C.accent}" style="background:${C.accent};border-radius:3px;font-size:0;line-height:0">&nbsp;</td>${w < 100 ? '<td style="font-size:0;line-height:0">&nbsp;</td>' : ''}</tr></table></td></tr>`;
    });
    return {
      inner: `${h2(title, hint)}<table ${T}>${html.join('')}</table>`,
      text: `\n${title.toUpperCase()}\n${rows.map(([l, n]) => `  - ${l} : ${n}`).join('\n')}\n`,
    };
  };

  /** Barres verticales (une par créneau), libellés de début et de fin dessous. */
  const bars = (values: number[], first: string, last: string, titles: string[]) => {
    const max = Math.max(1, ...values);
    const H = 110;
    const cells = values.map((v, i) => {
      const h = Math.max(2, Math.round((v / max) * H));
      return `<td valign="bottom" style="padding:0 1px" title="${esc(titles[i])}"><table ${T}><tr><td height="${h}" bgcolor="${C.accentDeep}" style="background:${C.accentDeep};border-radius:3px 3px 0 0;font-size:0;line-height:0">&nbsp;</td></tr></table></td>`;
    });
    return `<table ${T} height="${H}"><tr>${cells.join('')}</tr></table><table ${T} style="margin-top:6px"><tr><td style="${font('11px', 400, C.muted)}">${esc(first)}</td><td align="right" style="${font('11px', 400, C.muted)}">${esc(last)}</td></tr></table>`;
  };

  /** Carte de chaleur 7 × 24. */
  const heat = (grid: number[][]) => {
    const max = Math.max(1, ...grid.flat());
    const head = `<tr><td width="4%"></td>${Array.from({ length: 24 }, (_, h) => `<td width="4%" align="center" style="${font('9px', 400, C.muted)}">${h % 3 === 0 ? h : ''}</td>`).join('')}</tr>`;
    const rows = grid.map((r, d) => `<tr><td style="${font('10px', 400, C.muted)};padding-right:4px">${esc(texts.weekdaysShort[d])}</td>${r.map((y) => `<td width="4%" height="15" bgcolor="${y ? mixHex(C.soft, C.accentDeep, 0.15 + 0.85 * (y / max)) : C.page}" style="border:1px solid ${C.card};font-size:0;line-height:0">&nbsp;</td>`).join('')}</tr>`);
    return `<table ${T}>${head}${rows.join('')}</table>`;
  };

  const button = (href: string, label: string) =>
    `<tr><td align="center" style="padding:8px 24px 8px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.accentDeep}" style="background:${C.accentDeep};border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;${font('14px', 700, '#ffffff')};text-decoration:none">${esc(label)}</a></td></tr></table></td></tr>`;

  const header = (eyebrow: string, title: string, subtitle: string, logo: string) =>
    `<tr><td style="padding:0 24px 16px 24px"><table ${T} bgcolor="${C.head}" style="background:${C.head};border-radius:16px"><tr><td style="padding:26px 28px">${logo ? `<div style="margin-bottom:14px">${logo}</div>` : ''}<div style="${font('12px', 700, C.eyebrow)};letter-spacing:0.14em;text-transform:uppercase">${esc(eyebrow)}</div><div style="${font('26px/1.2', 800, C.headText, C.display)};margin-top:8px;letter-spacing:-0.02em">${esc(title)}</div><div style="${font('14px', 400, C.headMuted)};margin-top:6px">${esc(subtitle)}</div></td></tr></table></td></tr>`;

  const note = (text: string) => `<tr><td style="padding:0 24px 16px;${font('13px/1.5', 400, C.muted)}">${esc(text)}</td></tr>`;
  const callout = (html: string) => `<tr><td style="padding:0 24px 16px"><table ${T} style="background:${C.soft};border-radius:12px"><tr><td style="padding:14px 16px;${font('14px/1.5', 400, C.ink)}">${html}</td></tr></table></td></tr>`;
  const paragraph = (text: string) => `<tr><td style="padding:0 24px 16px;${font('15px/1.6', 400, C.ink)}">${escLines(text)}</td></tr>`;
  const footer = (text: string) => `<tr><td align="center" style="padding:14px 24px 0;${font('12px/1.6', 400, C.muted)}">${escLines(text)}</td></tr>`;

  /** Document complet : `rows` = lignes <tr> déjà assemblées. */
  const page = (title: string, preheader: string, rows: string) => `<!doctype html><html lang="${esc(texts.locale.slice(0, 2))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title>
<!--[if mso]><style>table{border-collapse:collapse}td{font-family:Arial,sans-serif}</style><![endif]--></head>
<body style="margin:0;padding:0;background:${C.page}"><div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;color:${C.page}">${esc(preheader)}</div>
<table ${T} bgcolor="${C.page}" style="background:${C.page}"><tr><td align="center" style="padding:24px 8px">
<!--[if mso]><table role="presentation" width="${MAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="${MAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${MAIL_WIDTH}px">
${rows}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;

  return { trend, box, card, row, pairs, h2, kpi, kpiRow, list, bars, heat, button, header, note, callout, paragraph, footer, page, fill };
}

export type MailKit = ReturnType<typeof mailKit>;
export { fill };
