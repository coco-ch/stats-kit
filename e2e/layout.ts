/*
 * Automatic layout check of the page as displayed, at the current width (same rules as the administration consoles that embed
 * the components). Only the elements inside `root` (the library's components) are checked, plus the horizontal scrolling of the
 * whole page. Six checks:
 *  1. horizontal scrolling of the page;
 *  2. element (text or control) that leaves the window;
 *  3. element that leaves its closest container with a visible edge (border, background or shadow: card, button, field, badge…);
 *  4. overlap: two "leaf" elements (displayed text fragments, controls) whose boxes cover each other by more than THRESHOLD pixels in
 *     both directions, without a parent-child relation, in the same layer;
 *  5. text cut on a button or a heading (overflow, ellipsis);
 *  6. tap target smaller than 48 × 48 px at phone widths (PHONE and below); a link inside running text is exempt (WCAG 2.5.8), a
 *     checkbox or radio button counts with its label.
 * Layers: a fixed element, an open `<dialog>`, an open `[popover]` or an element with `data-overlay` is drawn on top of the rest on
 * purpose; its elements are only compared with each other.
 */
import type { Page } from '@playwright/test';

/** Tolerated overlap (pixels, in each direction): text boxes slightly exceed their line with fonts that have tall ascenders. */
export const THRESHOLD = 4;
/** Minimum tap target (48 px; half a pixel of margin for rounding). */
export const TAP = 47.5;
/** Widths below which (inclusive) tap targets are checked. */
export const PHONE = 760;

export type DefectKind = 'scroll' | 'window' | 'container' | 'overlap' | 'cut' | 'tap';
export interface Box { x: number; y: number; w: number; h: number }
export interface Target { sel: string; box: Box }
export interface Defect { kind: DefectKind; a: Target; b?: Target; detail: string }

interface Options { root: string; phone: boolean; threshold: number; tap: number }

/** Analysis run in the page (self-contained function: it is serialised by Playwright). */
function analyse(o: Options): Defect[] {
  const defects: Defect[] = [];
  const doc = document.documentElement, vw = doc.clientWidth;
  const sx = window.scrollX, sy = window.scrollY;
  type R = { l: number; t: number; r: number; b: number };
  const rect = (r: DOMRect | R): R => ('left' in r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : r);
  const inter = (a: R, b: R): R => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
  const empty = (r: R) => r.r - r.l <= 0.5 || r.b - r.t <= 0.5;
  const box = (r: R): Box => ({ x: Math.round(r.l + sx), y: Math.round(r.t + sy), w: Math.round(r.r - r.l), h: Math.round(r.b - r.t) });
  const ALL: R = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
  const styles = new Map<Element, CSSStyleDeclaration>();
  const st = (e: Element) => { let s = styles.get(e); if (!s) { s = getComputedStyle(e); styles.set(e, s); } return s; };

  // Elements of the components, shadow-free (Angular's emulated encapsulation): every descendant of the roots.
  const roots = [...document.querySelectorAll(o.root)];
  const inside = (e: Element) => roots.some((r) => r.contains(e));
  const all = (sel: string) => roots.flatMap((r) => [...r.querySelectorAll(sel)]);

  // ---- readable description: context (ancestor with a meaningful class), then the element and its text
  const nameOf = (e: Element) => {
    const t = e.tagName.toLowerCase();
    if (e.id && !/^ng-|^\d/.test(e.id)) return `${t}#${e.id}`;
    const cls = [...e.classList].filter((c) => !/^ng-/.test(c)).slice(0, 2);
    return t + cls.map((c) => '.' + c).join('');
  };
  const describe = (e: Element) => {
    const chain: string[] = [];
    for (let x: Element | null = e, n = 0; x && x !== document.body && n < 3; x = x.parentElement, n++) {
      chain.unshift(nameOf(x));
      if (x !== e && (x.id || x.classList.length) && n >= 1) break;
    }
    const text = ((e as HTMLElement).innerText || (e as HTMLInputElement).value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim();
    return chain.join(' > ') + (text ? ` "${text.length > 40 ? text.slice(0, 39) + '…' : text}"` : '');
  };

  // ---- visibility, clipping by the ancestors that clip their content, layer
  const visible = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const clips = new Map<Element, R>();
  const clip = (e: Element | null): R => {
    if (!e || e === doc) return ALL;
    const known = clips.get(e); if (known) return known;
    const s = st(e);
    let r = s.position === 'fixed' ? ALL : clip(e.parentElement);
    if (e !== document.body && (s.overflowX !== 'visible' || s.overflowY !== 'visible')) {
      const b = e.getBoundingClientRect(), he = e as HTMLElement;
      const pad: R = { l: b.left + he.clientLeft, t: b.top + he.clientTop, r: b.left + he.clientLeft + he.clientWidth, b: b.top + he.clientTop + he.clientHeight };
      r = inter(r, { l: s.overflowX === 'visible' ? -1e9 : pad.l, r: s.overflowX === 'visible' ? 1e9 : pad.r, t: s.overflowY === 'visible' ? -1e9 : pad.t, b: s.overflowY === 'visible' ? 1e9 : pad.b });
    }
    clips.set(e, r);
    return r;
  };
  const layers = new Map<Element, Element | null>();
  const layer = (e: Element | null): Element | null => {
    if (!e || e === doc) return null;
    if (layers.has(e)) return layers.get(e)!;
    const s = st(e);
    const c = s.position === 'fixed' || e.hasAttribute('data-overlay') || (e instanceof HTMLDialogElement && e.open) || (e.hasAttribute('popover') && e.matches(':popover-open')) ? e : layer(e.parentElement);
    layers.set(e, c);
    return c;
  };
  // visually hidden element (1 px, clipped): never displayed
  const srOnly = (e: Element) => { const b = e.getBoundingClientRect(); return b.width <= 1.5 || b.height <= 1.5; };

  // ---- leaves: displayed text fragments (one box per line) and controls
  const CONTROLS = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=option], [role=combobox], [tabindex]:not([tabindex="-1"])';
  type Leaf = { e: Element; r: R; c: Element | null; control: boolean };
  const leaves: Leaf[] = [];
  for (const e of all(CONTROLS).filter((e) => visible(e) && !srOnly(e))) {
    // an inline link broken over two lines counts for its two pieces, not for the rectangle that holds them
    const pieces = st(e).display === 'inline' ? [...e.getClientRects()] : [e.getBoundingClientRect()];
    for (const m of pieces) {
      const r = inter(rect(m), clip(e.parentElement));
      if (!empty(r)) leaves.push({ e, r, c: layer(e), control: true });
    }
  }
  const range = document.createRange();
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\S/.test(n.nodeValue ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const e = n.parentElement!;
      if (!e || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'TEXTAREA', 'title'].includes(e.tagName) || !visible(e) || srOnly(e)) continue;
      range.selectNodeContents(n);
      const c = layer(e), cp = clip(e);
      for (const fr of range.getClientRects()) {
        const r = inter(rect(fr), cp);
        if (!empty(r) && fr.width > 1) leaves.push({ e, r, c, control: false });
      }
    }
  }

  // 1. horizontal scrolling of the page
  const over = Math.max(doc.scrollWidth, document.body.scrollWidth) - vw;
  if (over > 1) {
    const wide = leaves.filter((f) => f.r.r > vw + 1).sort((a, b) => b.r.r - a.r.r);
    const e = wide[0]?.e ?? document.body;
    defects.push({ kind: 'scroll', a: { sel: describe(e), box: box(wide[0]?.r ?? rect(e.getBoundingClientRect())) }, detail: `the page scrolls ${Math.round(over)} px to the right` });
  }

  // 2. out of the window (once per element)
  const seen = new Set<Element>();
  for (const f of leaves) {
    if (seen.has(f.e) || (f.r.r <= vw + 1 && f.r.l >= -1)) continue;
    seen.add(f.e);
    defects.push({ kind: 'window', a: { sel: describe(f.e), box: box(f.r) }, detail: `leaves the window (${Math.round(f.r.l)} → ${Math.round(f.r.r)} px, window of ${vw} px)` });
  }

  // 3. out of the closest container with a visible edge (border, background different from the one below, shadow); stops at an
  //    element positioned out of the flow (badge, menu): it may overflow its parent on purpose
  const shows = (c: string) => !/^(transparent|rgba\(.*,\s*0\))$/.test(c);
  const backgroundOf = (e: Element | null): string => { for (let x = e; x; x = x.parentElement) { const b = st(x).backgroundColor; if (shows(b)) return b; } return 'rgb(255, 255, 255)'; };
  const edged = (e: Element) => {
    if (e === document.body || e === doc || e.tagName === 'MAIN') return false;
    const s = st(e);
    const border = ['top', 'right', 'bottom', 'left'].some((k) => parseFloat(s.getPropertyValue(`border-${k}-width`)) > 0 && shows(s.getPropertyValue(`border-${k}-color`)) && s.getPropertyValue(`border-${k}-style`) !== 'none');
    return border || s.boxShadow !== 'none' || (shows(s.backgroundColor) && s.backgroundColor !== backgroundOf(e.parentElement));
  };
  const reported = new Set<string>();
  for (const f of leaves) {
    let x: Element | null = f.control ? f.e.parentElement : f.e;
    for (; x && x !== document.body; x = x.parentElement) {
      if (edged(x)) break;
      const p = st(x).position;
      if (p === 'absolute' || p === 'fixed') { x = null; break; }
    }
    if (!x || x === document.body || !visible(x) || !inside(x)) continue;
    const c = rect(x.getBoundingClientRect());
    const out = Math.max(c.l - f.r.l, f.r.r - c.r, c.t - f.r.t, f.r.b - c.b);
    if (out <= 2) continue;
    const key = describe(f.e) + '|' + describe(x);
    if (reported.has(key)) continue;
    reported.add(key);
    defects.push({ kind: 'container', a: { sel: describe(f.e), box: box(f.r) }, b: { sel: describe(x), box: box(c) }, detail: `exceeds its container by ${Math.round(out)} px` });
  }

  // 4. overlaps: sweep by ordinate (leaves sorted by their top are only compared with those that start before their bottom)
  const sorted = leaves.slice().sort((a, b) => a.r.t - b.r.t);
  const pairs = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    for (let j = i + 1; j < sorted.length && sorted[j]!.r.t < a.r.b - o.threshold; j++) {
      const b = sorted[j]!;
      if (a.c !== b.c || a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const r = inter(a.r, b.r);
      if (r.r - r.l <= o.threshold || r.b - r.t <= o.threshold) continue;
      // two text fragments of the same paragraph (neighbouring inline elements): only controls and separate blocks count
      if (!a.control && !b.control && a.e.parentElement === b.e.parentElement && st(a.e).display === 'inline' && st(b.e).display === 'inline') continue;
      const sa = describe(a.e), sb = describe(b.e), key = sa < sb ? sa + '|' + sb : sb + '|' + sa;
      if (pairs.has(key)) continue;
      pairs.add(key);
      defects.push({ kind: 'overlap', a: { sel: sa, box: box(a.r) }, b: { sel: sb, box: box(b.r) }, detail: `overlap of ${Math.round(r.r - r.l)} × ${Math.round(r.b - r.t)} px` });
    }
  }

  // 5. text cut on a button or a heading (itself or one of its elements: clipped by overflow, or ellipsis)
  const HEADS = 'button, [role=button], [role=tab], summary, h1, h2, h3, h4, h5, h6, legend, th';
  for (const t of all(HEADS)) {
    if (!visible(t) || srOnly(t)) continue;
    for (const e of [t, ...t.querySelectorAll('*')]) {
      const s = st(e), he = e as HTMLElement;
      if (!visible(e) || srOnly(e) || !(he.innerText ?? '').trim()) continue;
      const cutX = s.overflowX !== 'visible' || s.textOverflow === 'ellipsis', cutY = s.overflowY !== 'visible' || s.webkitLineClamp !== 'none';
      if ((cutX && he.scrollWidth > he.clientWidth + 1) || (cutY && he.scrollHeight > he.clientHeight + 1)) {
        defects.push({ kind: 'cut', a: { sel: describe(t), box: box(rect(t.getBoundingClientRect())) }, detail: `text cut (${he.scrollWidth} × ${he.scrollHeight} px of text for ${he.clientWidth} × ${he.clientHeight} px)` });
        break;
      }
    }
  }

  // 6. tap targets (phone): every control, except a link inside running text; a checkbox or radio button counts with its label
  if (o.phone) {
    const done = new Set<Element>();
    for (const e of all(CONTROLS + ', input[type=checkbox], input[type=radio]')) {
      if (e.matches('[tabindex]:not(a, button, input, select, textarea, summary, [role])')) continue; // scroll area or focusable heading
      const check = e.matches('input[type=checkbox], input[type=radio]');
      const target = check ? ((e as HTMLInputElement).labels?.[0] ?? e) : e;
      if (done.has(target) || !visible(target) || srOnly(target) || (!check && !visible(e))) continue;
      done.add(target);
      if (target.tagName === 'A' && st(target).display === 'inline') {
        const around = [...target.parentElement!.childNodes].some((n) => n !== target && n.nodeType !== Node.COMMENT_NODE && (n.textContent ?? '').trim());
        if (around) continue; // link inside running text (exempt, as in WCAG 2.5.8)
      }
      const r = target.getBoundingClientRect();
      if (empty(inter(rect(r), clip(target.parentElement)))) continue;
      if (r.height < o.tap || r.width < o.tap) {
        defects.push({ kind: 'tap', a: { sel: describe(target), box: box(rect(r)) }, detail: `tap target of ${Math.round(r.width)} × ${Math.round(r.height)} px (48 at least)` });
      }
    }
  }
  return defects;
}

/** Waits for a stable display: fonts loaded, finite animations finished (endless ones, like the live indicator, are ignored). */
async function settle(p: Page) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined)));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/** Layout defects of the displayed page at the current width, for the elements inside `root`. */
export async function checkLayout(p: Page, root = 'main'): Promise<Defect[]> {
  await settle(p);
  await p.evaluate(() => window.scrollTo(0, 0));
  await settle(p);
  return p.evaluate(analyse, { root, phone: p.viewportSize()!.width <= PHONE, threshold: THRESHOLD, tap: TAP });
}

/**
 * Enlarged text, as the text size setting of a phone: the font size of the page AND of the `rem` unit multiplied by `factor` (1:
 * unchanged).
 * `font` replaces the font of the page (a wide one makes the check as strict on every system as with the wide default fonts of
 * Linux). To call before the first navigation.
 */
export async function enlargeText(p: Page, factor = 2, font?: string) {
  await p.addInitScript(([f, family]) => document.addEventListener('DOMContentLoaded', () => {
    const size = (x: Element) => f * parseFloat(getComputedStyle(x).fontSize), s = document.createElement('style');
    s.textContent = `html { font-size: ${size(document.documentElement)}px !important; } body { font-size: ${size(document.body)}px !important; }`
      + (family ? ` html, body { font-family: ${family} !important; }` : '');
    document.head.append(s);
  }), [factor, font ?? ''] as const);
}

/** One line of the report for a defect. */
const at = (b: Box) => ` @${b.x},${b.y}`;
export const line = (context: string, d: Defect) => `${context} — ${d.kind}: ${d.a.sel}${at(d.a.box)}${d.b ? `  ×  ${d.b.sel}${at(d.b.box)}` : ''} (${d.detail})`;
