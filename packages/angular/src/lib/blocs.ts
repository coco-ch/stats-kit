/*
 * Briques d'affichage réutilisables : tuiles chiffrées, tableaux de classement triables (filtre, CSV), graphique temporel
 * (barres + courbe + période précédente), carte de chaleur jour × heure.
 */
import { ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, ElementRef, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import {
  delta, fileName, fill, formatDuration, formatNumber, formatPercent, gap, niceStep, slotLabel, toCsv,
  type Delta, type Texts, type Unit,
} from 'stats-kit/contrat';
import { download, injectOptions, resolveTexts } from './config';
import { TOKENS } from './theme';

/* ------------------------------------------------------------------------------------------------ tuiles */

/** Une tuile : libellé, chiffre, évolution, contexte, courbe ; `group` la range sous un titre. */
export interface TileData {
  id?: string;
  label: string;
  value: string;
  change: Delta | null;
  sub: string;
  spark: string;
  group?: string;
  highlight?: boolean;
}

const ZERO = /^(?:0(?:[,.]0+)?(?:\s?%)?|—)$/;

@Component({
  selector: 'sk-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.sk-zero]': 'zero()', '[class.sk-hl]': 'highlight()' },
  template: `
    <span class="sk-tile__label">{{ label() }}</span>
    <span class="sk-tile__row"><b class="sk-tile__value">{{ value() }}</b>@if (change()?.text) { <i [class]="'sk-d sk-d--' + change()!.tone">{{ change()!.text }}</i> }</span>
    <span class="sk-tile__sub">{{ sub() }}</span>
    <span class="sk-tile__trend">@if (spark()) { <svg class="sk-spark" [class.sk-spark--down]="change()?.tone === 'down'" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path [attr.d]="spark()" /></svg> }</span>
  `,
  styles: [TOKENS, `
    :host { display: grid; grid-row: span 4; grid-template-rows: subgrid; row-gap: .25rem; align-content: start; min-width: 0; padding: .8rem 1rem; background: var(--k-card); }
    :host(.sk-hl) { background: var(--k-warn-soft); }
    .sk-tile__label { align-self: end; font-size: .82rem; font-weight: 600; line-height: 1.3; color: var(--k-muted); overflow-wrap: break-word; }
    .sk-tile__row { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .55rem; }
    .sk-tile__value { font-size: 1.6rem; font-weight: 700; line-height: 1.1; letter-spacing: -.02em; color: var(--k-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
    :host(.sk-zero) .sk-tile__value { color: var(--k-muted); font-weight: 600; }
    .sk-tile__sub { font-size: .76rem; line-height: 1.35; color: var(--k-muted); }
    .sk-tile__sub:empty, .sk-tile__trend:empty { display: none; }
    .sk-d { display: inline-block; padding: .05rem .45rem; border-radius: 999px; font-style: normal; font-size: .74rem; font-weight: 700; line-height: 1.45; white-space: nowrap; font-variant-numeric: tabular-nums; background: var(--k-badge); color: var(--k-muted); }
    .sk-d--up { background: var(--k-up-soft); color: var(--k-up); }
    .sk-d--down { background: var(--k-down-soft); color: var(--k-down); }
    svg.sk-spark { display: block !important; width: 100% !important; height: 22px !important; max-width: none !important; overflow: visible; }
    .sk-spark path { fill: none; stroke: var(--k-c1); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
    .sk-spark--down path { stroke: var(--k-c3); }
  `],
})
export class SkTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly change = input<Delta | null>(null);
  readonly sub = input('');
  readonly spark = input('');
  readonly highlight = input(false);
  protected readonly zero = computed(() => ZERO.test(this.value()));
}

/** Tuiles rangées par thème : une carte par groupe, qui se partagent la largeur selon leur nombre de tuiles. */
@Component({
  selector: 'sk-tile-groups',
  imports: [SkTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (g of groups(); track g.title) {
      <section class="sk-tg" [style.--n]="g.tiles.length" [attr.aria-label]="g.title || null">
        @if (g.title) { <h2 class="sk-tg__title">{{ g.title }}</h2> }
        <div class="sk-tg__tiles">@for (k of g.tiles; track k.id ?? k.label) { <sk-tile [label]="k.label" [value]="k.value" [change]="k.change" [sub]="k.sub" [spark]="k.spark" [highlight]="!!k.highlight" /> }</div>
      </section>
    }
  `,
  styles: [TOKENS, `
    :host { display: flex; flex-wrap: wrap; gap: var(--k-gap); min-width: 0; }
    .sk-tg { flex: var(--n) 1 calc(var(--n) * 11rem); min-width: 0; max-width: 100%; display: grid; align-content: start; background: var(--k-card); border: 1px solid var(--k-line); border-radius: var(--k-radius); box-shadow: var(--k-shadow); overflow: hidden; }
    .sk-tg__title { margin: 0; padding: .75rem 1rem 0; font-size: .74rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--k-muted); }
    .sk-tg__tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr)); margin: .5rem -1px -1px 0; border-top: 1px solid var(--k-line); }
    .sk-tg__tiles > sk-tile { box-shadow: inset -1px 0 0 var(--k-line), inset 0 -1px 0 var(--k-line); }
    @media (max-width: 700px) { .sk-tg { flex-basis: 100%; } .sk-tg__tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `],
})
export class SkTileGroups {
  readonly tiles = input.required<TileData[]>();
  protected readonly groups = computed(() => {
    const by = new Map<string, TileData[]>();
    for (const t of this.tiles()) by.set(t.group ?? '', [...(by.get(t.group ?? '') ?? []), t]);
    return [...by].map(([title, tiles]) => ({ title, tiles }));
  });
}

/* ------------------------------------------------------------------------------------------------ tableau de classement */

export type ColKind = 'int' | 'dec' | 'pct' | 'dur' | 'pos' | 'text';
export interface Col {
  key: string;
  label: string;
  kind?: ColKind;
  /** Évolution par rapport à `prev[key]` (relative, ou absolue pour `pos` et `pct`). */
  delta?: boolean;
  lowerBetter?: boolean;
  tip?: string;
}
export interface MRow {
  label: string;
  sub?: string;
  /** Lien ouvert dans un nouvel onglet. */
  href?: string;
  values: Record<string, number | string | null>;
  prev?: Record<string, number | null | undefined>;
}

/** Valeur d'une cellule mise en forme. */
export function formatCell(texts: Texts, v: number | string | null | undefined, kind: ColKind): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string') return v;
  switch (kind) {
    case 'pct': return formatPercent(texts, v);
    case 'dur': return formatDuration(v);
    case 'pos': return formatNumber(texts, v, 1);
    case 'dec': return formatNumber(texts, v, 2);
    default: return formatNumber(texts, v);
  }
}

@Component({
  selector: 'sk-metric-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.sk-wide]': 'cols().length >= 4' },
  template: `
    <div class="sk-mt__head">
      <div class="sk-mt__titles"><h2>{{ title() }}</h2>@if (sub()) { <p class="sk-mt__sub">{{ sub() }}</p> }</div>
      <div class="sk-mt__tools sk-noprint">
        @if (rows().length > 12) { <input class="sk-mt__search" type="search" [placeholder]="fill(T().common.filter, { n: rows().length })" [attr.aria-label]="fill(T().common.filterOf, { title: title() })" (input)="query.set($any($event.target).value)" /> }
        @if (rows().length) { <button type="button" class="sk-mt__btn" (click)="csv()" [attr.aria-label]="fill(T().common.exportCsvOf, { title: title() })" [title]="fill(T().common.exportCsvOf, { title: title() })">{{ T().common.csv }}</button> }
      </div>
    </div>
    @if (rows().length) {
      <div class="sk-mt__wrap">
        <table class="sk-mt__table">
          <thead>
            <tr>
              <th scope="col">{{ head() }}</th>
              @for (c of cols(); track c.key) {
                <th scope="col" class="sk-num" [attr.aria-sort]="key() === c.key ? (desc() ? 'descending' : 'ascending') : null">
                  <button type="button" (click)="sortBy(c.key)" [title]="c.tip ?? T().common.sort">{{ c.label }}@if (key() === c.key) { <span aria-hidden="true">{{ desc() ? ' ▾' : ' ▴' }}</span> }</button>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (r of shown(); track r.label + $index) {
              <tr>
                <th scope="row" class="sk-lab" [style.--w]="bar(r)">
                  <span class="sk-lab__txt" [title]="r.sub ? r.label + ' — ' + r.sub : r.label">@if (r.href) { <a [href]="r.href" target="_blank" rel="noopener">{{ r.label }}</a> } @else { {{ r.label }} }@if (r.sub) { <small>{{ r.sub }}</small> }</span>
                </th>
                @for (c of cols(); track c.key) {
                  <td class="sk-num">{{ cell(r, c) }}@if (change(r, c); as d) { <small [class]="'sk-d sk-d--' + d.tone">{{ d.text }}</small> }</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (filtered().length > limit()) {
        <button type="button" class="sk-mt__more sk-noprint" (click)="all.set(!all())" [attr.aria-expanded]="all()">{{ all() ? T().common.collapse : fill(T().common.showAll, { n: filtered().length }) }}</button>
      }
    } @else {
      <p class="sk-mt__empty">{{ empty() || T().common.noData }}</p>
    }
  `,
  styles: [TOKENS, `
    :host { display: block; min-width: 0; padding: 1rem 1rem .75rem; background: var(--k-card); border: 1px solid var(--k-line); border-radius: var(--k-radius); box-shadow: var(--k-shadow); }
    .sk-mt__head { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem .75rem; margin-bottom: .75rem; }
    .sk-mt__titles { min-width: 0; }
    h2 { margin: 0; font-size: 1rem; }
    .sk-mt__sub { margin: .2rem 0 0; font-size: .78rem; line-height: 1.4; color: var(--k-muted); }
    .sk-mt__tools { display: flex; gap: .5rem; align-items: center; flex: none; }
    .sk-mt__search { width: 9.5rem; font: inherit; font-size: .8rem; min-height: 32px; padding: .2rem .55rem; border: 1px solid var(--k-line2); border-radius: 6px; background: var(--k-input); color: var(--k-ink); }
    .sk-mt__btn { font: inherit; font-size: .78rem; font-weight: 700; letter-spacing: .03em; min-height: 32px; padding: .2rem .6rem; border: 1px solid var(--k-line2); border-radius: 6px; background: var(--k-card); color: var(--k-ink2); cursor: pointer; }
    .sk-mt__btn:hover { color: var(--k-brand); border-color: var(--k-brand); }
    .sk-mt__wrap { overflow-x: auto; }
    .sk-mt__table { width: 100%; border-collapse: collapse; font-size: .875rem; font-variant-numeric: tabular-nums; }
    .sk-mt__table th, .sk-mt__table td { padding: .42rem .55rem; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--k-line); }
    .sk-mt__table tr > :first-child { padding-left: 0; }
    .sk-mt__table tr > :last-child { padding-right: 0; }
    .sk-mt__table thead th { padding-block: .3rem; font-size: .76rem; font-weight: 700; color: var(--k-muted); background: var(--k-card); }
    .sk-mt__table thead th:first-child { width: 100%; }
    .sk-mt__table thead button { all: unset; cursor: pointer; }
    .sk-mt__table thead button:hover, .sk-mt__table thead button:focus-visible { color: var(--k-brand); }
    .sk-mt__table thead button:focus-visible, .sk-mt__more:focus-visible, .sk-mt__btn:focus-visible, .sk-mt__search:focus-visible, .sk-lab a:focus-visible { outline: 2px solid var(--k-brand); outline-offset: 2px; border-radius: 4px; }
    .sk-num { text-align: right !important; }
    .sk-mt__table tbody tr:last-child > * { border-bottom: 0; }
    .sk-mt__table tbody tr:hover > * { background: var(--k-hover); }
    .sk-lab { position: relative; max-width: 0; min-width: 8.5rem; font-weight: 500; color: var(--k-ink); padding-bottom: .62rem !important; }
    .sk-lab::before, .sk-lab::after { content: ''; position: absolute; left: 0; bottom: .32rem; height: 4px; border-radius: 2px; }
    .sk-lab::before { right: 0; background: var(--k-track); }
    .sk-lab::after { width: var(--w, 0%); background: var(--k-c1); }
    .sk-lab__txt { display: block; overflow: hidden; text-overflow: ellipsis; }
    .sk-lab small { margin-left: .4rem; color: var(--k-muted); font-weight: 400; font-size: .76rem; }
    .sk-lab a { color: inherit; }
    .sk-d { font-style: normal; font-weight: 700; margin-left: .4rem; font-size: .74rem; }
    .sk-d--up { color: var(--k-up); } .sk-d--down { color: var(--k-down); } .sk-d--flat { color: var(--k-muted); }
    .sk-mt__more { all: unset; cursor: pointer; margin-top: .5rem; font-size: .875rem; color: var(--k-brand); font-weight: 600; }
    .sk-mt__more:hover { text-decoration: underline; }
    .sk-mt__empty { margin: .3rem 0; font-size: .875rem; color: var(--k-muted); }
    @media (max-width: 700px) {
      .sk-mt__table thead button { display: inline-flex; align-items: center; justify-content: flex-end; min-width: 44px; min-height: 44px; }
      .sk-mt__btn, .sk-mt__search { min-width: 44px; min-height: 44px; }
      .sk-mt__more { display: inline-flex; align-items: center; min-height: 44px; }
    }
    @media print { :host { box-shadow: none; break-inside: avoid; } .sk-lab::before, .sk-lab::after { print-color-adjust: exact; } }
  `],
})
export class SkMetricTable {
  private readonly doc = inject(DOCUMENT);
  readonly texts = input<Texts | null>(null);
  private readonly fallback = resolveTexts(injectOptions());
  protected readonly T = computed(() => this.texts() ?? this.fallback);
  protected readonly fill = fill;
  readonly title = input.required<string>();
  readonly sub = input('');
  readonly head = input('');
  readonly rows = input.required<MRow[]>();
  readonly cols = input.required<Col[]>();
  readonly limit = input(10);
  readonly empty = input('');
  readonly exportName = input('');
  readonly all = signal(false);
  readonly query = signal('');
  readonly sortKey = signal('');
  readonly desc = signal(true);

  protected readonly key = computed(() => this.sortKey() || this.cols()[0]?.key || '');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const k = this.key();
    const rows = q ? this.rows().filter((r) => r.label.toLowerCase().includes(q) || (r.sub ?? '').toLowerCase().includes(q)) : this.rows();
    const dir = this.desc() ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = a.values[k], y = b.values[k];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return String(x).localeCompare(String(y), this.T().locale) * dir;
    });
  });
  readonly shown = computed(() => (this.all() ? this.filtered() : this.filtered().slice(0, this.limit())));
  private readonly max = computed(() => Math.max(1, ...this.rows().map((r) => Number(r.values[this.cols()[0]?.key] ?? 0) || 0)));

  sortBy(k: string): void {
    if (this.key() === k) this.desc.update((d) => !d);
    else (this.sortKey.set(k), this.desc.set(true));
  }
  protected bar(r: MRow): string {
    const v = Number(r.values[this.cols()[0]?.key] ?? 0) || 0;
    return `${Math.round((v / this.max()) * 100)}%`;
  }
  protected cell(r: MRow, c: Col): string {
    return formatCell(this.T(), r.values[c.key], c.kind ?? 'int');
  }
  protected change(r: MRow, c: Col): Delta | null {
    if (!c.delta || !r.prev) return null;
    const now = r.values[c.key], before = r.prev[c.key];
    if (typeof now !== 'number' || before === undefined || before === null) return null;
    const T = this.T();
    const d = c.kind === 'pos' ? gap(T, now, before, true) : c.kind === 'pct' ? gap(T, now * 100, before * 100, !!c.lowerBetter, 1, ' pt') : delta(T, now, before, !!c.lowerBetter);
    return d.text ? d : null;
  }
  /** Lignes exportées : en-têtes puis lignes filtrées et triées. */
  csvRows(): (string | number | null)[][] {
    const cols = this.cols();
    return [[this.head() || this.title(), ...cols.map((c) => c.label)], ...this.filtered().map((r) => [r.label, ...cols.map((c) => r.values[c.key] ?? null)])];
  }
  csv(): void {
    download(this.doc, `${this.exportName() || fileName(this.title())}.csv`, toCsv(this.csvRows()));
  }
}

/* ------------------------------------------------------------------------------------------------ graphique temporel */

/*
 * Barres (série principale), courbe (série secondaire, même échelle) et période précédente en pointillés, un créneau par colonne.
 * Dessiné à la largeur réelle de la carte : les textes gardent leur taille ; une table masquée donne les valeurs aux lecteurs d'écran.
 */
@Component({
  selector: 'sk-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk-tc__head">
      <h2>{{ title() }}</h2>
      <ul class="sk-tc__legend" [attr.aria-label]="T().common.legend">
        <li><b class="sk-k-bar"></b>{{ barLabel() }}</li>
        @if (line().length) { <li><b class="sk-k-line"></b>{{ lineLabel() }}</li> }
        @if (prev().length) { <li><b class="sk-k-dash"></b>{{ T().common.previousPeriod }}</li> }
      </ul>
    </div>
    <div class="sk-tc__plot" #plot>
      <svg class="sk-tc__svg" [attr.viewBox]="'0 0 ' + W() + ' ' + H" [attr.height]="H" role="img" [attr.aria-label]="aria()" focusable="false">
        @for (g of grid(); track g.v) { <line class="sk-grid" [attr.x1]="L" [attr.x2]="W() - R" [attr.y1]="g.y" [attr.y2]="g.y" /><text class="sk-tick" [attr.x]="L - 8" [attr.y]="g.y + 4" text-anchor="end">{{ g.label }}</text> }
        @for (b of bars(); track b.i) { <rect class="sk-bar" [attr.x]="b.x" [attr.y]="b.top" [attr.width]="b.w" [attr.height]="b.h + b.r" [attr.rx]="b.r"><title>{{ b.label }} : {{ b.text }}</title></rect> }
        <rect class="sk-cut" [attr.x]="L" [attr.y]="base() + 0.5" [attr.width]="W() - L - R" height="5" />
        <line class="sk-grid sk-grid--base" [attr.x1]="L" [attr.x2]="W() - R" [attr.y1]="base()" [attr.y2]="base()" />
        @if (prevPath()) { <path class="sk-prev" [attr.d]="prevPath()" /> }
        @if (linePath()) { <path class="sk-line" [attr.d]="linePath()" /> }
        @for (t of ticks(); track t.i) { <text class="sk-tick" [attr.x]="t.x" [attr.y]="H - 4" [attr.text-anchor]="t.anchor">{{ t.label }}</text> }
      </svg>
    </div>
    <div class="sk-sr"><table>
      <caption>{{ title() }}</caption>
      <thead><tr><th scope="col"></th><th scope="col">{{ barLabel() }}</th>@if (line().length) { <th scope="col">{{ lineLabel() }}</th> }@if (prev().length) { <th scope="col">{{ T().common.previousPeriod }}</th> }</tr></thead>
      <tbody>@for (s of slots(); track s; let i = $index) { <tr><th scope="row">{{ label(s) }}</th><td>{{ bar()[i] ?? 0 }}</td>@if (line().length) { <td>{{ line()[i] ?? 0 }}</td> }@if (prev().length) { <td>{{ prev()[i] ?? 0 }}</td> }</tr> }</tbody>
    </table></div>
    @if (foot()) { <p class="sk-tc__foot">{{ foot() }}</p> }
  `,
  styles: [TOKENS, `
    :host { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 1rem 1rem .75rem; background: var(--k-card); border: 1px solid var(--k-line); border-radius: var(--k-radius); box-shadow: var(--k-shadow); }
    .sk-tc__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .25rem 1rem; }
    h2 { margin: 0; font-size: 1rem; }
    .sk-tc__legend { display: flex; flex-wrap: wrap; gap: .25rem 1rem; margin: 0; padding: 0; list-style: none; font-size: .76rem; font-weight: 600; color: var(--k-ink2); }
    .sk-tc__legend li { display: inline-flex; align-items: center; }
    .sk-tc__legend b { display: inline-block; width: 12px; height: 10px; margin-right: 6px; border-radius: 3px 3px 0 0; }
    .sk-k-bar { background: var(--k-c1); }
    .sk-k-line { width: 16px !important; height: 0 !important; border-top: 2px solid var(--k-c2); border-radius: 0 !important; }
    .sk-k-dash { width: 16px !important; height: 0 !important; border-top: 2px dashed var(--k-c3); border-radius: 0 !important; }
    .sk-tc__plot { flex: 1; min-width: 0; margin-top: .75rem; }
    svg.sk-tc__svg { display: block !important; width: 100% !important; height: auto !important; max-width: none !important; overflow: visible; }
    .sk-grid { stroke: var(--k-line); stroke-width: 1; shape-rendering: crispEdges; }
    .sk-grid--base { stroke: var(--k-line2); }
    .sk-cut { fill: var(--k-card); }
    .sk-tick { font-size: 11px; fill: var(--k-muted); font-variant-numeric: tabular-nums; }
    rect.sk-bar { fill: var(--k-c1); }
    rect.sk-bar:hover { fill: var(--k-c1h); }
    path.sk-line { fill: none; stroke: var(--k-c2); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    path.sk-prev { fill: none; stroke: var(--k-c3); stroke-width: 2; stroke-dasharray: 5 4; stroke-linecap: round; }
    .sk-tc__foot { margin: .5rem 0 0; font-size: .78rem; color: var(--k-muted); }
    .sk-sr { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    @media print { :host { box-shadow: none; break-inside: avoid; } rect, path { print-color-adjust: exact; } }
  `],
})
export class SkTrendChart {
  readonly texts = input<Texts | null>(null);
  private readonly fallback = resolveTexts(injectOptions());
  protected readonly T = computed(() => this.texts() ?? this.fallback);
  /** Largeur mesurée de la zone de dessin. */
  protected readonly W = signal(640);
  protected readonly H = 220;
  protected readonly L = 44;
  protected readonly R = 6;
  private readonly TOP = 10;
  private readonly B = 22;
  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');

  readonly title = input.required<string>();
  readonly barLabel = input('');
  readonly lineLabel = input('');
  readonly foot = input('');
  readonly slots = input.required<string[]>();
  readonly unit = input<Unit>('day');
  readonly bar = input.required<number[]>();
  readonly line = input<number[]>([]);
  /** Période précédente, alignée créneau par créneau. */
  readonly prev = input<number[]>([]);

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(([e]) => this.W.set(Math.max(240, Math.round(e.contentRect.width))));
      ro.observe(this.plot().nativeElement);
      destroy.onDestroy(() => ro.disconnect());
    });
  }

  private readonly max = computed(() => Math.max(1, ...this.bar(), ...this.line(), ...this.prev()));
  private readonly step = computed(() => niceStep(this.max()));
  private readonly top = computed(() => this.step() * Math.ceil(this.max() / this.step()));
  protected readonly base = computed(() => this.H - this.B);
  private readonly band = computed(() => (this.W() - this.L - this.R) / Math.max(1, this.slots().length));
  private x(i: number): number {
    return this.L + this.band() * (i + 0.5);
  }
  private y(v: number): number {
    return this.base() - (v / this.top()) * (this.base() - this.TOP);
  }
  protected label(slot: string): string {
    return slotLabel(this.T(), slot, this.unit(), true);
  }
  readonly grid = computed(() => {
    const s = this.step();
    return Array.from({ length: Math.round(this.top() / s) + 1 }, (_, i) => ({ v: i * s, y: Math.round(this.y(i * s)) + 0.5, label: formatNumber(this.T(), i * s) }));
  });
  readonly bars = computed(() => {
    const w = Math.max(2, Math.min(24, this.band() * 0.68));
    const r = Math.min(4, w / 2);
    const slots = this.slots();
    return this.bar().slice(0, slots.length).map((v, i) => {
      const h = Math.max(v ? 2 : 0, this.base() - this.y(v));
      return { i, x: this.x(i) - w / 2, w, h, r: h ? r : 0, top: this.base() - h, label: this.label(slots[i]), text: formatNumber(this.T(), v) };
    });
  });
  private path(values: number[]): string {
    return values.slice(0, this.slots().length).map((v, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)} ${this.y(v).toFixed(1)}`).join(' ');
  }
  readonly linePath = computed(() => (this.line().length > 1 ? this.path(this.line()) : ''));
  readonly prevPath = computed(() => (this.prev().length > 1 ? this.path(this.prev()) : ''));
  readonly ticks = computed(() => {
    const slots = this.slots();
    if (!slots.length) return [];
    const n = Math.min(slots.length, Math.min(7, Math.max(2, Math.floor((this.W() - this.L) / 110))));
    return Array.from({ length: n }, (_, k) => {
      const i = n === 1 ? 0 : Math.round((k * (slots.length - 1)) / (n - 1));
      return { i, x: this.x(i), label: slotLabel(this.T(), slots[i], this.unit()), anchor: k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle' };
    });
  });
  readonly aria = computed(() => fill(this.T().stats.chartTotal, { title: this.title(), n: formatNumber(this.T(), this.bar().reduce((s, v) => s + v, 0)) }));
}

/* ------------------------------------------------------------------------------------------------ carte de chaleur */

@Component({
  selector: 'sk-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk-heat" role="img" [attr.aria-label]="aria()">
      <span></span>
      @for (h of hours; track h) { <span class="sk-heat__hr" aria-hidden="true">{{ h % 3 === 0 ? h : '' }}</span> }
      @for (row of rows(); track row.day) {
        <span class="sk-heat__day" aria-hidden="true">{{ row.day }}</span>
        @for (c of row.cells; track c.hour) { <span class="sk-heat__cell" [style.opacity]="c.opacity" [title]="c.title"></span> }
      }
    </div>
  `,
  styles: [TOKENS, `
    :host { display: block; min-width: 0; }
    .sk-heat { display: grid; grid-template-columns: auto repeat(24, minmax(0, 1fr)); gap: 2px; font-size: .72rem; color: var(--k-muted); }
    .sk-heat__cell { aspect-ratio: 1.3; border-radius: 3px; background: var(--k-c1); min-height: 8px; }
    .sk-heat__day { align-self: center; padding-right: 6px; }
    .sk-heat__hr { text-align: center; }
    @media print { .sk-heat__cell { print-color-adjust: exact; } }
  `],
})
export class SkHeatmap {
  readonly texts = input<Texts | null>(null);
  private readonly fallback = resolveTexts(injectOptions());
  protected readonly T = computed(() => this.texts() ?? this.fallback);
  readonly grid = input.required<number[][]>();
  /** Résumé lu par les lecteurs d'écran (« Créneau le plus actif : … »). */
  readonly summary = input('');
  protected readonly hours = Array.from({ length: 24 }, (_, i) => i);
  protected readonly rows = computed(() => {
    const grid = this.grid();
    const max = Math.max(1, ...grid.flat());
    const T = this.T();
    return grid.map((row, d) => ({
      day: T.weekdaysShort[d],
      cells: row.map((y, hour) => ({ hour, opacity: y ? 0.15 + (y / max) * 0.85 : 0.06, title: fill(T.stats.heatCell, { day: T.weekdays[d], hour, n: formatNumber(T, y) }) })),
    }));
  });
  protected readonly aria = computed(() => `${this.T().stats.heatTitle} ${this.summary()}`.trim());
}
