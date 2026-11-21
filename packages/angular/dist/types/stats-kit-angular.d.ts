/** Standalone Angular components of the stats-kit library. */
import * as i0 from "@angular/core";
import { InjectionToken, OnInit, Provider } from "@angular/core";
import { Delta, IndexationResponse, Item, SearchOverview, SearchRow, Section, StatsOverview, TextOverrides, Texts, Unit, YoutubeOverview, fill, plural } from "stats-kit/contract";
/** A tile: label, figure, change, context, line; `group` puts it under a title. */
interface TileData {
  id?: string;
  label: string;
  value: string;
  change: Delta | null;
  sub: string;
  spark: string;
  group?: string;
  highlight?: boolean;
}
export declare class SkTile {
  readonly label: import("@angular/core").InputSignal<string>;
  readonly value: import("@angular/core").InputSignal<string>;
  readonly change: import("@angular/core").InputSignal<Delta | null>;
  readonly sub: import("@angular/core").InputSignal<string>;
  readonly spark: import("@angular/core").InputSignal<string>;
  readonly highlight: import("@angular/core").InputSignal<boolean>;
  protected readonly zero: import("@angular/core").Signal<boolean>;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkTile, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkTile, "sk-tile", never, {
    "label": {
      "alias": "label";
      "required": true;
      "isSignal": true;
    };
    "value": {
      "alias": "value";
      "required": true;
      "isSignal": true;
    };
    "change": {
      "alias": "change";
      "required": false;
      "isSignal": true;
    };
    "sub": {
      "alias": "sub";
      "required": false;
      "isSignal": true;
    };
    "spark": {
      "alias": "spark";
      "required": false;
      "isSignal": true;
    };
    "highlight": {
      "alias": "highlight";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
/** Tiles grouped by theme: one card per group, sharing the width according to their number of tiles. */
export declare class SkTileGroups {
  readonly tiles: import("@angular/core").InputSignal<TileData[]>;
  protected readonly groups: import("@angular/core").Signal<{
    title: string;
    tiles: TileData[];
  }[]>;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkTileGroups, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkTileGroups, "sk-tile-groups", never, {
    "tiles": {
      "alias": "tiles";
      "required": true;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
type ColKind = 'int' | 'dec' | 'pct' | 'dur' | 'pos' | 'text';
interface Col {
  key: string;
  label: string;
  kind?: ColKind;
  /** Change compared with `prev[key]` (relative, or absolute for `pos` and `pct`). */
  delta?: boolean;
  lowerBetter?: boolean;
  tip?: string;
}
interface MRow {
  label: string;
  sub?: string;
  /** Link opened in a new tab. */
  href?: string;
  values: Record<string, number | string | null>;
  prev?: Record<string, number | null | undefined>;
}
/** Formatted value of a cell. */
export declare function formatCell(texts: Texts, v: number | string | null | undefined, kind: ColKind): string;
export declare class SkMetricTable {
  private readonly doc;
  readonly texts: import("@angular/core").InputSignal<Texts | null>;
  private readonly fallback;
  protected readonly T: import("@angular/core").Signal<Texts>;
  protected readonly fill: typeof fill;
  readonly title: import("@angular/core").InputSignal<string>;
  readonly sub: import("@angular/core").InputSignal<string>;
  readonly head: import("@angular/core").InputSignal<string>;
  readonly rows: import("@angular/core").InputSignal<MRow[]>;
  readonly cols: import("@angular/core").InputSignal<Col[]>;
  readonly limit: import("@angular/core").InputSignal<number>;
  readonly empty: import("@angular/core").InputSignal<string>;
  readonly exportName: import("@angular/core").InputSignal<string>;
  readonly all: import("@angular/core").WritableSignal<boolean>;
  readonly query: import("@angular/core").WritableSignal<string>;
  readonly sortKey: import("@angular/core").WritableSignal<string>;
  readonly desc: import("@angular/core").WritableSignal<boolean>;
  protected readonly key: import("@angular/core").Signal<string>;
  readonly filtered: import("@angular/core").Signal<MRow[]>;
  readonly shown: import("@angular/core").Signal<MRow[]>;
  private readonly max;
  sortBy(k: string): void;
  protected bar(r: MRow): string;
  protected cell(r: MRow, c: Col): string;
  protected change(r: MRow, c: Col): Delta | null;
  /** Exported rows: headers, then filtered and sorted rows. */
  csvRows(): (string | number | null)[][];
  csv(): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkMetricTable, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkMetricTable, "sk-metric-table", never, {
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "title": {
      "alias": "title";
      "required": true;
      "isSignal": true;
    };
    "sub": {
      "alias": "sub";
      "required": false;
      "isSignal": true;
    };
    "head": {
      "alias": "head";
      "required": false;
      "isSignal": true;
    };
    "rows": {
      "alias": "rows";
      "required": true;
      "isSignal": true;
    };
    "cols": {
      "alias": "cols";
      "required": true;
      "isSignal": true;
    };
    "limit": {
      "alias": "limit";
      "required": false;
      "isSignal": true;
    };
    "empty": {
      "alias": "empty";
      "required": false;
      "isSignal": true;
    };
    "exportName": {
      "alias": "exportName";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
export declare class SkTrendChart {
  readonly texts: import("@angular/core").InputSignal<Texts | null>;
  private readonly fallback;
  protected readonly T: import("@angular/core").Signal<Texts>;
  /** Measured width of the drawing area. */
  protected readonly W: import("@angular/core").WritableSignal<number>;
  protected readonly H = 220;
  protected readonly L = 44;
  protected readonly R = 6;
  private readonly TOP;
  private readonly B;
  private readonly plot;
  readonly title: import("@angular/core").InputSignal<string>;
  readonly barLabel: import("@angular/core").InputSignal<string>;
  readonly lineLabel: import("@angular/core").InputSignal<string>;
  readonly foot: import("@angular/core").InputSignal<string>;
  readonly slots: import("@angular/core").InputSignal<string[]>;
  readonly unit: import("@angular/core").InputSignal<Unit>;
  readonly bar: import("@angular/core").InputSignal<number[]>;
  readonly line: import("@angular/core").InputSignal<number[]>;
  /** Previous period, aligned slot by slot. */
  readonly prev: import("@angular/core").InputSignal<number[]>;
  constructor();
  private readonly max;
  private readonly step;
  private readonly top;
  protected readonly base: import("@angular/core").Signal<number>;
  private readonly band;
  private x;
  private y;
  protected label(slot: string): string;
  readonly grid: import("@angular/core").Signal<{
    v: number;
    y: number;
    label: string;
  }[]>;
  readonly bars: import("@angular/core").Signal<{
    i: number;
    x: number;
    w: number;
    h: number;
    r: number;
    top: number;
    title: string;
  }[]>;
  private path;
  readonly linePath: import("@angular/core").Signal<string>;
  readonly prevPath: import("@angular/core").Signal<string>;
  readonly ticks: import("@angular/core").Signal<{
    i: number;
    x: number;
    label: string;
    anchor: string;
  }[]>;
  readonly aria: import("@angular/core").Signal<string>;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkTrendChart, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkTrendChart, "sk-trend-chart", never, {
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "title": {
      "alias": "title";
      "required": true;
      "isSignal": true;
    };
    "barLabel": {
      "alias": "barLabel";
      "required": false;
      "isSignal": true;
    };
    "lineLabel": {
      "alias": "lineLabel";
      "required": false;
      "isSignal": true;
    };
    "foot": {
      "alias": "foot";
      "required": false;
      "isSignal": true;
    };
    "slots": {
      "alias": "slots";
      "required": true;
      "isSignal": true;
    };
    "unit": {
      "alias": "unit";
      "required": false;
      "isSignal": true;
    };
    "bar": {
      "alias": "bar";
      "required": true;
      "isSignal": true;
    };
    "line": {
      "alias": "line";
      "required": false;
      "isSignal": true;
    };
    "prev": {
      "alias": "prev";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
export declare class SkHeatmap {
  readonly texts: import("@angular/core").InputSignal<Texts | null>;
  private readonly fallback;
  protected readonly T: import("@angular/core").Signal<Texts>;
  readonly grid: import("@angular/core").InputSignal<number[][]>;
  /** Summary read by screen readers ("Busiest slot: …"). */
  readonly summary: import("@angular/core").InputSignal<string>;
  protected readonly hours: import("@angular/core").Signal<{
    hour: number;
    label: string;
  }[]>;
  protected readonly rows: import("@angular/core").Signal<{
    day: string;
    cells: {
      hour: number;
      opacity: number;
      title: string;
    }[];
  }[]>;
  protected readonly aria: import("@angular/core").Signal<string>;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkHeatmap, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkHeatmap, "sk-heatmap", never, {
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "grid": {
      "alias": "grid";
      "required": true;
      "isSignal": true;
    };
    "summary": {
      "alias": "summary";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
/** To put first in the styles of every component. */
export declare const TOKENS = "\n  :host { \n  --_card:#ffffff; --_bg:transparent; --_ink:#141a2a; --_ink2:#343c50; --_muted:#566073; --_line:#e1e5ee; --_line2:#c3c9d6;\n  --_brand:#2f5bd3; --_brand-ink:#ffffff; --_c1:#2f5bd3; --_c1h:#1f43a8; --_c2:#c2410c; --_c3:#7c8598;\n  --_up:#0a6e53; --_up-soft:#e2f3ec; --_down:#b3261e; --_down-soft:#fbe8e6; --_warn:#7c5100; --_warn-soft:#fff2d4;\n  --_hover:#f3f5fa; --_track:#e8ebf2; --_input:#ffffff; --_badge:#eef1f6;\n  --_map-sea:#f3f5fa; --_map-land:#dde2ec; --_map-border:#ffffff; --_map-lo:#bccaf2; --_map-hi:#1d3c9c;\n  --_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);\n  color-scheme: light; \n  --k-card: var(--sk-card, var(--_card));\n  --k-bg: var(--sk-bg, var(--_bg));\n  --k-ink: var(--sk-ink, var(--_ink));\n  --k-ink2: var(--sk-ink-2, var(--_ink2));\n  --k-muted: var(--sk-muted, var(--_muted));\n  --k-line: var(--sk-line, var(--_line));\n  --k-line2: var(--sk-line-strong, var(--_line2));\n  --k-brand: var(--sk-brand, var(--_brand));\n  --k-brand-ink: var(--sk-on-brand, var(--_brand-ink));\n  --k-c1: var(--sk-chart-1, var(--_c1));\n  --k-c1h: var(--sk-chart-1-hover, var(--_c1h));\n  --k-c2: var(--sk-chart-2, var(--_c2));\n  --k-c3: var(--sk-chart-3, var(--_c3));\n  --k-up: var(--sk-up, var(--_up));\n  --k-up-soft: var(--sk-up-soft, var(--_up-soft));\n  --k-down: var(--sk-down, var(--_down));\n  --k-down-soft: var(--sk-down-soft, var(--_down-soft));\n  --k-warn: var(--sk-warn, var(--_warn));\n  --k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));\n  --k-hover: var(--sk-hover, var(--_hover));\n  --k-track: var(--sk-bar-track, var(--_track));\n  --k-input: var(--sk-input, var(--_input));\n  --k-badge: var(--sk-badge, var(--_badge));\n  --k-map-sea: var(--sk-map-sea, var(--_map-sea));\n  --k-map-land: var(--sk-map-land, var(--_map-land));\n  --k-map-border: var(--sk-map-border, var(--_map-border));\n  --k-map-lo: var(--sk-map-lo, var(--_map-lo));\n  --k-map-hi: var(--sk-map-hi, var(--_map-hi));\n  --k-shadow: var(--sk-shadow, var(--_shadow));\n --k-radius: var(--sk-radius, 12px); --k-gap: var(--sk-gap, 12px); --k-font: var(--sk-font, inherit); }\n  :host-context([data-sk-mode=dark]) { \n  --_card:#171c27; --_ink:#e9ecf4; --_ink2:#c8cedb; --_muted:#a5adbf; --_line:#2b3242; --_line2:#414a5e;\n  --_brand:#8fb0ff; --_brand-ink:#0e1424; --_c1:#7d9ef7; --_c1h:#a9c0ff; --_c2:#ff9b62; --_c3:#8d96aa;\n  --_up:#6fdcb1; --_up-soft:#143a2e; --_down:#ff9f95; --_down-soft:#43201d; --_warn:#ffd27a; --_warn-soft:#3d3014;\n  --_hover:#1f2634; --_track:#283042; --_input:#11151e; --_badge:#252c3b;\n  --_map-sea:#121722; --_map-land:#2a3140; --_map-border:#171c27; --_map-lo:#2c437f; --_map-hi:#9ab6ff;\n  --_shadow:0 1px 2px rgb(0 0 0 / 30%);\n  color-scheme: dark; }\n";
/** Layout blocks shared by the pages ("sk-" prefix: no collision with the site classes). */
export declare const LAYOUT = "\n  :host { display: block; width: 100%; min-width: 0; font-family: var(--k-font); color: var(--k-ink); background: var(--k-bg); line-height: 1.45; }\n  * { box-sizing: border-box; }\n  h1, h2, h3, p { margin: 0; }\n  .sk-page { display: grid; gap: calc(var(--k-gap) * 1.33); min-width: 0; }\n  .sk-head { display: grid; gap: .5rem; }\n  .sk-head .sk-title { font-size: 1.6rem; line-height: 1.2; letter-spacing: -.01em; }\n  .sk-lead { color: var(--k-muted); font-size: .95rem; max-width: 70ch; }\n  .sk-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .75rem; }\n  .sk-group { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }\n  .sk-card { min-width: 0; background: var(--k-card); border: 1px solid var(--k-line); border-radius: var(--k-radius); box-shadow: var(--k-shadow); padding: 1rem; }\n  .sk-card h2 { font-size: 1rem; }\n  .sk-sub { margin-top: .2rem; font-size: .8rem; color: var(--k-muted); }\n  .sk-btn { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 36px; padding: .35rem .8rem; font: inherit; font-size: .875rem; font-weight: 600; color: var(--k-ink); background: var(--k-card); border: 1px solid var(--k-line2); border-radius: 8px; cursor: pointer; text-decoration: none; }\n  .sk-btn:hover { border-color: var(--k-brand); color: var(--k-brand); }\n  .sk-btn:disabled { opacity: .6; cursor: default; }\n  .sk-btn--primary { background: var(--k-brand); border-color: var(--k-brand); color: var(--k-brand-ink); }\n  .sk-btn--primary:hover { color: var(--k-brand-ink); filter: brightness(1.08); }\n  .sk-btn:focus-visible, .sk-seg button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--k-brand); outline-offset: 2px; }\n  .sk-seg { display: inline-flex; flex-wrap: wrap; padding: 3px; gap: 2px; background: var(--k-badge); border-radius: 10px; }\n  .sk-seg button { min-height: 32px; padding: .25rem .75rem; font: inherit; font-size: .85rem; font-weight: 600; color: var(--k-ink2); background: transparent; border: 0; border-radius: 8px; cursor: pointer; }\n  .sk-seg button[aria-pressed=true] { background: var(--k-card); color: var(--k-ink); box-shadow: 0 1px 2px rgb(0 0 0 / 15%); }\n  .sk-field { display: inline-flex; align-items: center; gap: .35rem; font-size: .85rem; color: var(--k-ink2); }\n  .sk-field input, .sk-field select { min-height: 34px; padding: .2rem .45rem; font: inherit; color: var(--k-ink); background: var(--k-input); border: 1px solid var(--k-line2); border-radius: 8px; }\n  .sk-status { display: flex; gap: .6rem; align-items: flex-start; padding: .75rem 1rem; border-radius: var(--k-radius); font-size: .9rem; border: 1px solid var(--k-line); background: var(--k-card); }\n  .sk-status--warn { background: var(--k-warn-soft); color: var(--k-warn); border-color: transparent; }\n  .sk-status--err { background: var(--k-down-soft); color: var(--k-down); border-color: transparent; }\n  .sk-status--ok { background: var(--k-up-soft); color: var(--k-up); border-color: transparent; }\n  .sk-status b { display: block; }\n  .sk-empty { padding: 1.5rem 1rem; text-align: center; color: var(--k-muted); }\n  .sk-empty b { display: block; color: var(--k-ink); margin-bottom: .25rem; }\n  .sk-section { display: grid; gap: var(--k-gap); scroll-margin-top: 1rem; }\n  .sk-section > h2 { font-size: 1.15rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .6rem; }\n  .sk-section > h2 small { font-size: .8rem; font-weight: 400; color: var(--k-muted); }\n  .sk-grid { container-type: inline-size; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(26rem, 100%), 1fr)); gap: var(--k-gap); align-items: start; grid-auto-flow: dense; }\n  @container (min-width: 53rem) { .sk-grid > .sk-wide { grid-column: span 2; } }\n  .sk-twin { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--k-gap); align-items: stretch; }\n  @media (max-width: 1100px) { .sk-twin { grid-template-columns: minmax(0, 1fr); } }\n  .sk-jump { display: flex; flex-wrap: wrap; gap: .25rem .9rem; font-size: .85rem; }\n  .sk-jump a { color: var(--k-brand); font-weight: 600; text-decoration: none; padding: .35rem 0; }\n  .sk-jump a:hover { text-decoration: underline; }\n  .sk-small { font-size: .8rem; color: var(--k-muted); }\n  .sk-sr { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }\n  @media (max-width: 700px) { .sk-btn, .sk-seg button, .sk-field input, .sk-field select { min-height: 44px; } .sk-head .sk-title { font-size: 1.35rem; } }\n  @media print { .sk-toolbar, .sk-jump, .sk-noprint { display: none !important; } .sk-card { box-shadow: none; break-inside: avoid; } }\n";
type ThemeChoice = 'auto' | 'light' | 'dark';
/**
 * Page title of a component: `h1` (default, a page of its own), `h2` (a part of a page that already has its `h1`), or `none` (no
 * title nor lead: the host page shows its own; the period buttons stay).
 */
type HeadingLevel = 'h1' | 'h2' | 'none';
interface Block {
  id: string;
  section: Section;
  title: string;
  sub?: string;
  head: string;
  cols: Col[];
  rows: MRow[];
  limit?: number;
}
export declare class SkStatistics implements OnInit {
  private readonly api;
  private readonly doc;
  private readonly options;
  /** API address (default: the one of `provideStatsKit`). Changing it reloads the page (site selector): no need to recreate it. */
  readonly apiUrl: import("@angular/core").InputSignal<string | null>;
  readonly locale: import("@angular/core").InputSignal<string | null>;
  readonly texts: import("@angular/core").InputSignal<TextOverrides | null>;
  /** Periods offered, in days (1 = 24 hours). */
  readonly presets: import("@angular/core").InputSignal<number[]>;
  readonly initialDays: import("@angular/core").InputSignal<number>;
  /** Report preview and send buttons. */
  readonly report: import("@angular/core").InputSignal<boolean>;
  /** Light, dark, or following the system. */
  readonly theme: import("@angular/core").InputSignal<ThemeChoice>;
  /** Refresh of the live count and of the page (milliseconds; 0 not to refresh). */
  readonly liveMs: import("@angular/core").InputSignal<number>;
  readonly refreshMs: import("@angular/core").InputSignal<number>;
  /** Address of the base map (default: the `worldUrl` option, then `{apiUrl}/world.json` with the apiUrl of this page). */
  readonly worldUrl: import("@angular/core").InputSignal<string | null>;
  /** Page title: `h1`, `h2` (inside a page that has its own `h1`) or `none` (default: the `heading` option, then `h1`). */
  readonly heading: import("@angular/core").InputSignal<HeadingLevel | null>;
  protected readonly mode: import("@angular/core").Signal<"light" | "dark">;
  protected readonly T: import("@angular/core").Signal<import("stats-kit/contract").Texts>;
  protected readonly fill: typeof fill;
  protected readonly plural: typeof plural;
  protected readonly today: string;
  protected readonly base: import("@angular/core").Signal<string>;
  protected readonly level: import("@angular/core").Signal<HeadingLevel>;
  protected readonly days: import("@angular/core").WritableSignal<number>;
  protected readonly custom: import("@angular/core").WritableSignal<boolean>;
  protected readonly from: import("@angular/core").WritableSignal<string>;
  protected readonly to: import("@angular/core").WritableSignal<string>;
  protected readonly loading: import("@angular/core").WritableSignal<boolean>;
  protected readonly failed: import("@angular/core").WritableSignal<boolean>;
  readonly data: import("@angular/core").WritableSignal<StatsOverview | null>;
  protected readonly active: import("@angular/core").WritableSignal<number | null>;
  protected readonly stale: import("@angular/core").WritableSignal<boolean>;
  protected readonly auto: import("@angular/core").WritableSignal<boolean>;
  protected readonly now: import("@angular/core").WritableSignal<number>;
  protected readonly reporting: import("@angular/core").WritableSignal<boolean>;
  protected readonly message: import("@angular/core").WritableSignal<{
    ok: boolean;
    text: string;
  } | null>;
  private readonly destroy;
  private readonly browser;
  constructor();
  ngOnInit(): void;
  private canRefresh;
  protected readonly ok: import("@angular/core").Signal<boolean>;
  protected fmt(v: number, d?: number): string;
  /** Label followed by the separator of the language ("Device:", "Appareil :"). */
  protected colon(label: string): string;
  protected sum(v: number[]): number;
  protected readonly updated: import("@angular/core").Signal<string>;
  protected readonly range: import("@angular/core").Signal<string>;
  protected readonly bestDay: import("@angular/core").Signal<string>;
  protected readonly slotText: import("@angular/core").Signal<string>;
  protected readonly mapMax: import("@angular/core").Signal<number>;
  readonly tiles: import("@angular/core").Signal<TileData[]>;
  readonly funnel: import("@angular/core").Signal<{
    label: string;
    value: string;
    w: string;
    note: string;
  }[]>;
  protected readonly visitsDelta: import("@angular/core").Signal<Col[]>;
  private itemRows;
  protected readonly countryRows: import("@angular/core").Signal<MRow[]>;
  readonly blocks: import("@angular/core").Signal<Block[]>;
  protected readonly sections: import("@angular/core").Signal<{
    blocks: Block[];
    id: Section;
    title: string;
    sub: string;
  }[]>;
  protected readonly sessionRows: import("@angular/core").Signal<{
    place: string;
    tech: string;
    views: string;
    when: string;
  }[]>;
  private query;
  protected choose(days: number): void;
  protected openCustom(): void;
  /** Loads the period (loading screen). */
  run(): Promise<void>;
  /** Reloads; silently, a failure keeps the display and reports it. */
  private fetch;
  private refreshLive;
  protected jump(e: Event, id: string): void;
  protected print(): void;
  /** Opens the report as it would be sent, in a new tab, without sending anything. */
  previewReport(): Promise<void>;
  /** Sends the report of the period to the recipients chosen by the site (after confirmation). */
  sendReport(): Promise<void>;
  /** Rows of the global CSV export: totals, series, then all the tables. */
  csvRows(): (string | number | null)[][];
  exportCsv(): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkStatistics, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkStatistics, "sk-statistics, sk-statistiques", never, {
    "apiUrl": {
      "alias": "apiUrl";
      "required": false;
      "isSignal": true;
    };
    "locale": {
      "alias": "locale";
      "required": false;
      "isSignal": true;
    };
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "presets": {
      "alias": "presets";
      "required": false;
      "isSignal": true;
    };
    "initialDays": {
      "alias": "initialDays";
      "required": false;
      "isSignal": true;
    };
    "report": {
      "alias": "report";
      "required": false;
      "isSignal": true;
    };
    "theme": {
      "alias": "theme";
      "required": false;
      "isSignal": true;
    };
    "liveMs": {
      "alias": "liveMs";
      "required": false;
      "isSignal": true;
    };
    "refreshMs": {
      "alias": "refreshMs";
      "required": false;
      "isSignal": true;
    };
    "worldUrl": {
      "alias": "worldUrl";
      "required": false;
      "isSignal": true;
    };
    "heading": {
      "alias": "heading";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
/** @deprecated since 0.2.0, use `SkStatistics` (tag `<sk-statistics>`). */
export declare const SkStatistiques: typeof SkStatistics;
/** @deprecated since 0.2.0, use `SkStatistics`. */
export type SkStatistiques = SkStatistics;
type Scope = 'all' | 'brand' | 'nonbrand';
export declare class SkSearchConsole {
  private readonly api;
  private readonly doc;
  private readonly options;
  /** API address (default: the one of `provideStatsKit`). Changing it reloads the page: no need to recreate it. */
  readonly apiUrl: import("@angular/core").InputSignal<string | null>;
  readonly locale: import("@angular/core").InputSignal<string | null>;
  readonly texts: import("@angular/core").InputSignal<TextOverrides | null>;
  readonly presets: import("@angular/core").InputSignal<number[]>;
  readonly initialDays: import("@angular/core").InputSignal<number>;
  readonly theme: import("@angular/core").InputSignal<ThemeChoice>;
  /** Page title: `h1`, `h2` (inside a page that has its own `h1`) or `none` (default: the `heading` option, then `h1`). */
  readonly heading: import("@angular/core").InputSignal<HeadingLevel | null>;
  protected readonly mode: import("@angular/core").Signal<"light" | "dark">;
  protected readonly T: import("@angular/core").Signal<import("stats-kit/contract").Texts>;
  protected readonly fill: typeof fill;
  private readonly base;
  protected readonly level: import("@angular/core").Signal<HeadingLevel>;
  protected readonly days: import("@angular/core").WritableSignal<number>;
  protected readonly loading: import("@angular/core").WritableSignal<boolean>;
  protected readonly failed: import("@angular/core").WritableSignal<boolean>;
  readonly data: import("@angular/core").WritableSignal<SearchOverview | null>;
  readonly indexation: import("@angular/core").WritableSignal<IndexationResponse | null>;
  protected readonly checking: import("@angular/core").WritableSignal<boolean>;
  readonly scope: import("@angular/core").WritableSignal<Scope>;
  constructor();
  protected readonly ok: import("@angular/core").Signal<boolean>;
  protected date(v: string, withYear?: boolean): string;
  private fmt;
  protected choose(days: number): void;
  load(): Promise<void>;
  checkIndexation(): Promise<void>;
  protected print(): void;
  protected readonly slots: import("@angular/core").Signal<string[]>;
  protected series(k: 'clicks' | 'impressions'): number[];
  protected previous(k: 'clicks' | 'impressions'): number[];
  readonly tiles: import("@angular/core").Signal<TileData[]>;
  protected readonly perfCols: import("@angular/core").Signal<Col[]>;
  protected readonly plainCols: import("@angular/core").Signal<Col[]>;
  protected readonly sitemapCols: import("@angular/core").Signal<Col[]>;
  protected readonly indexCols: import("@angular/core").Signal<Col[]>;
  private label;
  protected rows(list: SearchRow[], prev: SearchRow[] | null, kind?: 'query' | 'page' | 'country' | 'device' | null): MRow[];
  private readonly scoped;
  protected readonly queryRows: import("@angular/core").Signal<MRow[]>;
  protected readonly queryPageRows: import("@angular/core").Signal<MRow[]>;
  protected readonly pageRows: import("@angular/core").Signal<MRow[]>;
  protected readonly countryRows: import("@angular/core").Signal<MRow[]>;
  protected readonly deviceRows: import("@angular/core").Signal<MRow[]>;
  protected readonly sitemapRows: import("@angular/core").Signal<MRow[]>;
  protected readonly indexRows: import("@angular/core").Signal<MRow[]>;
  protected readonly opportunities: import("@angular/core").Signal<({
    id: string;
    title: string;
    sub: string;
    head: string;
    cols: Col[];
    rows: {
      label: string;
      values: {
        impressions: number;
        position: number;
        clicks: number;
        gain: number;
      };
    }[];
  } | {
    id: string;
    title: string;
    sub: string;
    head: string;
    cols: Col[];
    rows: {
      label: string;
      values: {
        impressions: number;
        before: number;
        diff: number;
        position: number | null;
      };
    }[];
  } | {
    id: string;
    title: string;
    sub: string;
    head: string;
    cols: Col[];
    rows: MRow[];
  } | {
    id: string;
    title: string;
    sub: string;
    head: string;
    cols: Col[];
    rows: {
      label: string;
      href: string;
      values: {
        before: number;
        impressions: number;
        position: number | null;
      };
    }[];
  } | {
    id: string;
    title: string;
    sub: string;
    head: string;
    cols: Col[];
    rows: {
      label: string;
      sub: string;
      values: {
        pages: number;
        impressions: number;
        clicks: number;
      };
    }[];
  })[]>;
  csvRows(): (string | number | null)[][];
  exportCsv(): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkSearchConsole, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkSearchConsole, "sk-search-console", never, {
    "apiUrl": {
      "alias": "apiUrl";
      "required": false;
      "isSignal": true;
    };
    "locale": {
      "alias": "locale";
      "required": false;
      "isSignal": true;
    };
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "presets": {
      "alias": "presets";
      "required": false;
      "isSignal": true;
    };
    "initialDays": {
      "alias": "initialDays";
      "required": false;
      "isSignal": true;
    };
    "theme": {
      "alias": "theme";
      "required": false;
      "isSignal": true;
    };
    "heading": {
      "alias": "heading";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
export declare class SkYoutube {
  private readonly api;
  private readonly doc;
  private readonly options;
  /** API address (default: the one of `provideStatsKit`). Changing it reloads the page: no need to recreate it. */
  readonly apiUrl: import("@angular/core").InputSignal<string | null>;
  readonly locale: import("@angular/core").InputSignal<string | null>;
  readonly texts: import("@angular/core").InputSignal<TextOverrides | null>;
  readonly presets: import("@angular/core").InputSignal<number[]>;
  readonly initialDays: import("@angular/core").InputSignal<number>;
  readonly theme: import("@angular/core").InputSignal<ThemeChoice>;
  /** Page title: `h1`, `h2` (inside a page that has its own `h1`) or `none` (default: the `heading` option, then `h1`). */
  readonly heading: import("@angular/core").InputSignal<HeadingLevel | null>;
  protected readonly mode: import("@angular/core").Signal<"light" | "dark">;
  protected readonly T: import("@angular/core").Signal<import("stats-kit/contract").Texts>;
  protected readonly fill: typeof fill;
  private readonly base;
  protected readonly level: import("@angular/core").Signal<HeadingLevel>;
  protected readonly days: import("@angular/core").WritableSignal<number>;
  protected readonly loading: import("@angular/core").WritableSignal<boolean>;
  protected readonly failed: import("@angular/core").WritableSignal<boolean>;
  readonly data: import("@angular/core").WritableSignal<YoutubeOverview | null>;
  constructor();
  protected choose(days: number): void;
  load(): Promise<void>;
  private fmt;
  protected readonly dateOf: (d: {
    date: string;
  }) => string;
  protected readonly period: import("@angular/core").Signal<{
    start: string;
    end: string;
    totals: import("stats-kit/contract").YoutubeTotals;
    previous: import("stats-kit/contract").YoutubeTotals;
    current: import("stats-kit/contract").YoutubeDay[];
    before: import("stats-kit/contract").YoutubeDay[];
  }>;
  protected bars(k: 'views' | 'minutes'): number[];
  protected prevBars(k: 'views' | 'minutes'): number[];
  readonly tiles: import("@angular/core").Signal<TileData[]>;
  readonly siteTiles: import("@angular/core").Signal<TileData[]>;
  protected readonly viewCols: import("@angular/core").Signal<Col[]>;
  protected readonly requestCols: import("@angular/core").Signal<Col[]>;
  protected readonly trafficCols: import("@angular/core").Signal<Col[]>;
  protected readonly videoCols: import("@angular/core").Signal<Col[]>;
  protected readonly landingRows: import("@angular/core").Signal<MRow[]>;
  protected readonly subjectRows: import("@angular/core").Signal<MRow[]>;
  protected readonly trafficRows: import("@angular/core").Signal<MRow[]>;
  protected readonly videoRows: import("@angular/core").Signal<MRow[]>;
  csvRows(): (string | number | null)[][];
  exportCsv(): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkYoutube, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkYoutube, "sk-youtube", never, {
    "apiUrl": {
      "alias": "apiUrl";
      "required": false;
      "isSignal": true;
    };
    "locale": {
      "alias": "locale";
      "required": false;
      "isSignal": true;
    };
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "presets": {
      "alias": "presets";
      "required": false;
      "isSignal": true;
    };
    "initialDays": {
      "alias": "initialDays";
      "required": false;
      "isSignal": true;
    };
    "theme": {
      "alias": "theme";
      "required": false;
      "isSignal": true;
    };
    "heading": {
      "alias": "heading";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
interface Shape {
  iso: string;
  d: string;
  n: number;
}
export declare class SkWorldMap {
  private readonly api;
  private readonly options;
  readonly texts: import("@angular/core").InputSignal<Texts | null>;
  private readonly fallback;
  protected readonly T: import("@angular/core").Signal<Texts>;
  /** Visits by country (key = ISO alpha-2 code). */
  readonly countries: import("@angular/core").InputSignal<Item[]>;
  /** Address of the base map (default: the `worldUrl` option, then `{apiUrl}/world.json`). */
  readonly worldUrl: import("@angular/core").InputSignal<string | null>;
  /** API address of the source shown (default: the one of `provideStatsKit`); the base map is read under it. */
  readonly apiUrl: import("@angular/core").InputSignal<string | null>;
  /** Displayed name of a country (default: localised name). */
  readonly label: import("@angular/core").InputSignal<(code: string) => string>;
  /** Colours of the visited countries: few → many (default: --sk-map-lo / --sk-map-hi variables read on the page). */
  readonly low: import("@angular/core").InputSignal<string | null>;
  readonly high: import("@angular/core").InputSignal<string | null>;
  private readonly world;
  protected readonly hover: import("@angular/core").WritableSignal<{
    iso: string;
    n: number;
  } | null>;
  protected readonly zoom: import("@angular/core").WritableSignal<number>;
  private readonly center;
  private drag;
  constructor();
  private readonly counts;
  private readonly max;
  private readonly paths;
  protected readonly shapes: import("@angular/core").Signal<Shape[]>;
  protected readonly bubbles: import("@angular/core").Signal<{
    iso: string;
    n: number;
    x: number;
    y: number;
    r: number;
  }[]>;
  protected readonly viewBox: import("@angular/core").Signal<string>;
  protected readonly summary: import("@angular/core").Signal<string>;
  protected format(n: number): string;
  /** Country and its visits, as the language writes it. */
  protected country(iso: string, n: number): string;
  /** Colour of a country: mix of the two shades (explicit values, otherwise CSS variables mixed with `color-mix`). */
  protected color(n: number): string;
  private clamp;
  zoomBy(f: number): void;
  reset(): void;
  protected down(e: PointerEvent): void;
  protected move(e: PointerEvent): void;
  protected up(e: PointerEvent): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<SkWorldMap, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<SkWorldMap, "sk-world-map", never, {
    "texts": {
      "alias": "texts";
      "required": false;
      "isSignal": true;
    };
    "countries": {
      "alias": "countries";
      "required": true;
      "isSignal": true;
    };
    "worldUrl": {
      "alias": "worldUrl";
      "required": false;
      "isSignal": true;
    };
    "apiUrl": {
      "alias": "apiUrl";
      "required": false;
      "isSignal": true;
    };
    "label": {
      "alias": "label";
      "required": false;
      "isSignal": true;
    };
    "low": {
      "alias": "low";
      "required": false;
      "isSignal": true;
    };
    "high": {
      "alias": "high";
      "required": false;
      "isSignal": true;
    };
  }, {}, never, never, true, never>;
}
interface StatsKitOptions {
  /**
   * Address where the server mounts the library routes ("/api/admin/audience"). Avoid "analytics", "stats" or "track" in the
   * address: ad blockers block these calls.
   */
  apiUrl: string;
  /**
   * Address of the base map of the world map (GeoJSON). Default: `{apiUrl}/world.json`, where `apiUrl` is the one of the
   * component (its `apiUrl` input, otherwise this option), so the map follows the source it shows. A relative address
   * ("api/admin/audience", without a leading slash) is resolved against the page (`<base href>`): use it when the
   * administration is served under a sub-path.
   */
  worldUrl?: string;
  /** Page title of the components (`h1` by default, `h2`, or `none`); each component can override it with its `heading` input. */
  heading?: HeadingLevel;
  /**
   * Language of the texts: "en", "fr", "de", "es", "it", "pt", "nl", or a tag with a region ("fr-CH", "en-US") for number and
   * date formats. Default: the application's `LOCALE_ID`, then English.
   */
  locale?: string;
  /** Text overrides (site settings). */
  texts?: TextOverrides;
  /** Complete texts of a language the library does not ship. */
  baseTexts?: Texts;
}
export declare const STATS_KIT_OPTIONS: InjectionToken<StatsKitOptions>;
/** `providers: [provideHttpClient(), provideStatsKit({ apiUrl: '/api/admin/audience', locale: 'fr' })]` */
export declare const provideStatsKit: (options: StatsKitOptions) => Provider[];
/** Texts in force, completed by the overrides of the component. */
export declare function resolveTexts(o: StatsKitOptions, locale?: string | null, overrides?: TextOverrides | null): Texts;
/** Calls to the library API (HttpClient: the site's interceptors, for authentication for example, apply). */
export declare class StatsKitApi {
  private readonly http;
  private readonly worlds;
  get<T>(base: string, path: string, params?: Record<string, string | number>): Promise<T>;
  post<T>(base: string, path: string, params?: Record<string, string | number>): Promise<T>;
  /** Base map, loaded once per address. */
  world(url: string): Promise<unknown>;
  static ɵfac: i0.ɵɵFactoryDeclaration<StatsKitApi, never>;
  static ɵprov: i0.ɵɵInjectableDeclaration<any>;
}
export type { Col, ColKind, HeadingLevel, MRow, StatsKitOptions, ThemeChoice, TileData };