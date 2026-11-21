/*
 * Thème des composants : variables CSS publiques `--sk-*` que le site peut définir sur n'importe quel ancêtre (ou sur la balise du
 * composant), avec des valeurs par défaut claires et sombres. Aucun style global : tout est dans les styles des composants.
 *
 * Mode : `data-sk-mode="dark"` sur un ancêtre (posé par les pages selon leur entrée `theme`, ou par le site) passe en sombre.
 * Une variable publique définie par le site l'emporte toujours ; à lui d'en donner une valeur sombre sous son propre sélecteur.
 */
import { DestroyRef, DOCUMENT, computed, inject, signal, type Signal } from '@angular/core';

const LIGHT = `
  --_card:#ffffff; --_bg:transparent; --_ink:#141a2a; --_ink2:#343c50; --_muted:#566073; --_line:#e1e5ee; --_line2:#c3c9d6;
  --_brand:#2f5bd3; --_brand-ink:#ffffff; --_c1:#2f5bd3; --_c1h:#1f43a8; --_c2:#c2410c; --_c3:#7c8598;
  --_up:#0a6e53; --_up-soft:#e2f3ec; --_down:#b3261e; --_down-soft:#fbe8e6; --_warn:#7c5100; --_warn-soft:#fff2d4;
  --_hover:#f3f5fa; --_track:#e8ebf2; --_input:#ffffff; --_badge:#eef1f6;
  --_map-sea:#f3f5fa; --_map-land:#dde2ec; --_map-border:#ffffff; --_map-lo:#bccaf2; --_map-hi:#1d3c9c;
  --_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);
  color-scheme: light;`;

const DARK = `
  --_card:#171c27; --_ink:#e9ecf4; --_ink2:#c8cedb; --_muted:#a5adbf; --_line:#2b3242; --_line2:#414a5e;
  --_brand:#8fb0ff; --_brand-ink:#0e1424; --_c1:#7d9ef7; --_c1h:#a9c0ff; --_c2:#ff9b62; --_c3:#8d96aa;
  --_up:#6fdcb1; --_up-soft:#143a2e; --_down:#ff9f95; --_down-soft:#43201d; --_warn:#ffd27a; --_warn-soft:#3d3014;
  --_hover:#1f2634; --_track:#283042; --_input:#11151e; --_badge:#252c3b;
  --_map-sea:#121722; --_map-land:#2a3140; --_map-border:#171c27; --_map-lo:#2c437f; --_map-hi:#9ab6ff;
  --_shadow:0 1px 2px rgb(0 0 0 / 30%);
  color-scheme: dark;`;

/** Variables résolues `--k-*` : publique `--sk-*` si le site l'a définie, sinon valeur par défaut du mode. */
const RESOLVED = `
  --k-card: var(--sk-card, var(--_card));
  --k-bg: var(--sk-bg, var(--_bg));
  --k-ink: var(--sk-ink, var(--_ink));
  --k-ink2: var(--sk-ink-2, var(--_ink2));
  --k-muted: var(--sk-muted, var(--_muted));
  --k-line: var(--sk-line, var(--_line));
  --k-line2: var(--sk-line-strong, var(--_line2));
  --k-brand: var(--sk-brand, var(--_brand));
  --k-brand-ink: var(--sk-on-brand, var(--_brand-ink));
  --k-c1: var(--sk-chart-1, var(--_c1));
  --k-c1h: var(--sk-chart-1-hover, var(--_c1h));
  --k-c2: var(--sk-chart-2, var(--_c2));
  --k-c3: var(--sk-chart-3, var(--_c3));
  --k-up: var(--sk-up, var(--_up));
  --k-up-soft: var(--sk-up-soft, var(--_up-soft));
  --k-down: var(--sk-down, var(--_down));
  --k-down-soft: var(--sk-down-soft, var(--_down-soft));
  --k-warn: var(--sk-warn, var(--_warn));
  --k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));
  --k-hover: var(--sk-hover, var(--_hover));
  --k-track: var(--sk-bar-track, var(--_track));
  --k-input: var(--sk-input, var(--_input));
  --k-badge: var(--sk-badge, var(--_badge));
  --k-map-sea: var(--sk-map-sea, var(--_map-sea));
  --k-map-land: var(--sk-map-land, var(--_map-land));
  --k-map-border: var(--sk-map-border, var(--_map-border));
  --k-map-lo: var(--sk-map-lo, var(--_map-lo));
  --k-map-hi: var(--sk-map-hi, var(--_map-hi));
  --k-shadow: var(--sk-shadow, var(--_shadow));
`;

/** À placer en tête des styles de chaque composant. */
export const TOKENS = `
  :host { ${LIGHT} ${RESOLVED} --k-radius: var(--sk-radius, 12px); --k-gap: var(--sk-gap, 12px); --k-font: var(--sk-font, inherit); }
  :host-context([data-sk-mode=dark]) { ${DARK} }
`;

/** Briques de mise en page communes aux pages (préfixe « sk- » : aucune collision avec les classes du site). */
export const LAYOUT = `
  :host { display: block; width: 100%; min-width: 0; font-family: var(--k-font); color: var(--k-ink); background: var(--k-bg); line-height: 1.45; }
  * { box-sizing: border-box; }
  h1, h2, h3, p { margin: 0; }
  .sk-page { display: grid; gap: calc(var(--k-gap) * 1.33); min-width: 0; }
  .sk-head { display: grid; gap: .5rem; }
  .sk-head h1 { font-size: 1.6rem; line-height: 1.2; letter-spacing: -.01em; }
  .sk-lead { color: var(--k-muted); font-size: .95rem; max-width: 70ch; }
  .sk-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .75rem; }
  .sk-group { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
  .sk-card { min-width: 0; background: var(--k-card); border: 1px solid var(--k-line); border-radius: var(--k-radius); box-shadow: var(--k-shadow); padding: 1rem; }
  .sk-card h2 { font-size: 1rem; }
  .sk-sub { margin-top: .2rem; font-size: .8rem; color: var(--k-muted); }
  .sk-btn { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 36px; padding: .35rem .8rem; font: inherit; font-size: .875rem; font-weight: 600; color: var(--k-ink); background: var(--k-card); border: 1px solid var(--k-line2); border-radius: 8px; cursor: pointer; text-decoration: none; }
  .sk-btn:hover { border-color: var(--k-brand); color: var(--k-brand); }
  .sk-btn:disabled { opacity: .6; cursor: default; }
  .sk-btn--primary { background: var(--k-brand); border-color: var(--k-brand); color: var(--k-brand-ink); }
  .sk-btn--primary:hover { color: var(--k-brand-ink); filter: brightness(1.08); }
  .sk-btn:focus-visible, .sk-seg button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--k-brand); outline-offset: 2px; }
  .sk-seg { display: inline-flex; flex-wrap: wrap; padding: 3px; gap: 2px; background: var(--k-badge); border-radius: 10px; }
  .sk-seg button { min-height: 32px; padding: .25rem .75rem; font: inherit; font-size: .85rem; font-weight: 600; color: var(--k-ink2); background: transparent; border: 0; border-radius: 8px; cursor: pointer; }
  .sk-seg button[aria-pressed=true] { background: var(--k-card); color: var(--k-ink); box-shadow: 0 1px 2px rgb(0 0 0 / 15%); }
  .sk-field { display: inline-flex; align-items: center; gap: .35rem; font-size: .85rem; color: var(--k-ink2); }
  .sk-field input, .sk-field select { min-height: 34px; padding: .2rem .45rem; font: inherit; color: var(--k-ink); background: var(--k-input); border: 1px solid var(--k-line2); border-radius: 8px; }
  .sk-status { display: flex; gap: .6rem; align-items: flex-start; padding: .75rem 1rem; border-radius: var(--k-radius); font-size: .9rem; border: 1px solid var(--k-line); background: var(--k-card); }
  .sk-status--warn { background: var(--k-warn-soft); color: var(--k-warn); border-color: transparent; }
  .sk-status--err { background: var(--k-down-soft); color: var(--k-down); border-color: transparent; }
  .sk-status--ok { background: var(--k-up-soft); color: var(--k-up); border-color: transparent; }
  .sk-status b { display: block; }
  .sk-empty { padding: 1.5rem 1rem; text-align: center; color: var(--k-muted); }
  .sk-empty b { display: block; color: var(--k-ink); margin-bottom: .25rem; }
  .sk-section { display: grid; gap: var(--k-gap); scroll-margin-top: 1rem; }
  .sk-section > h2 { font-size: 1.15rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .6rem; }
  .sk-section > h2 small { font-size: .8rem; font-weight: 400; color: var(--k-muted); }
  .sk-grid { container-type: inline-size; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(26rem, 100%), 1fr)); gap: var(--k-gap); align-items: start; grid-auto-flow: dense; }
  @container (min-width: 53rem) { .sk-grid > .sk-wide { grid-column: span 2; } }
  .sk-twin { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--k-gap); align-items: stretch; }
  @media (max-width: 1100px) { .sk-twin { grid-template-columns: minmax(0, 1fr); } }
  .sk-jump { display: flex; flex-wrap: wrap; gap: .25rem .9rem; font-size: .85rem; }
  .sk-jump a { color: var(--k-brand); font-weight: 600; text-decoration: none; padding: .35rem 0; }
  .sk-jump a:hover { text-decoration: underline; }
  .sk-small { font-size: .8rem; color: var(--k-muted); }
  .sk-sr { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  @media (max-width: 700px) { .sk-btn, .sk-seg button, .sk-field input, .sk-field select { min-height: 44px; } .sk-head h1 { font-size: 1.35rem; } }
  @media print { .sk-toolbar, .sk-jump, .sk-noprint { display: none !important; } .sk-card { box-shadow: none; break-inside: avoid; } }
`;

export type ThemeChoice = 'auto' | 'light' | 'dark';

/** Mode effectif (« light » / « dark ») d'un choix, en suivant le système pour « auto ». */
export function resolvedMode(choice: Signal<ThemeChoice>): Signal<'light' | 'dark'> {
  const doc = inject(DOCUMENT);
  const mq = doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  const system = signal<'light' | 'dark'>(mq?.matches ? 'dark' : 'light');
  if (mq) {
    const on = (e: MediaQueryListEvent) => system.set(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', on));
  }
  return computed(() => (choice() === 'auto' ? system() : choice()) as 'light' | 'dark');
}
