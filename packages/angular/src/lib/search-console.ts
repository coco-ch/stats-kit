/*
 * "Google" page (Search Console): tiles, impressions and clicks per day with the previous period, queries (all, brand,
 * non-brand), queries × pages, opportunities and anomalies, pages, countries, devices, appearance, sitemaps, indexing.
 */
import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import {
  byKey, cannibalization, countryName, csvSeparator, delta, fill, formatNumber, formatPercent, gap, isBrand, lostPages, lowCtrPages, movers, newQueries, pathOf, potential,
  shortDate, sparkPath, toCsv,
  type IndexationResponse, type SearchOverview, type SearchRow, type TextOverrides,
} from 'stats-kit/contract';
import { SkMetricTable, SkTileGroups, SkTrendChart, type Col, type MRow, type TileData } from './blocks';
import { StatsKitApi, download, injectOptions, loadOnSource, resolveTexts } from './config';
import { LAYOUT, TOKENS, resolvedMode, type HeadingLevel, type ThemeChoice } from './theme';

type Scope = 'all' | 'brand' | 'nonbrand';

@Component({
  selector: 'sk-search-console',
  imports: [SkTileGroups, SkMetricTable, SkTrendChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-sk-mode]': 'mode()' },
  styles: [TOKENS, LAYOUT, `.sk-help { margin-top: .4rem; font-size: .85rem; overflow-wrap: anywhere; } .sk-help code { font-size: .85em; }`],
  template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().search.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().search.title }}</h2> }
        }
        @if (level() !== 'none') { <p class="sk-lead">{{ T().search.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
            @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="days() === p" (click)="choose(p)">{{ fill(T().periods.days, { n: p }) }}</button> }
          </div>
          @if (ok()) { <div class="sk-group"><button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button><button type="button" class="sk-btn" (click)="print()">{{ T().common.print }}</button></div> }
        </div>
      </header>

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().search.notConfiguredTitle }}</b>{{ T().search.notConfiguredHelp }}</div></div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().search.errorTitle }}</b>{{ d.error }}
            @if (d.serviceAccount && d.property) { <p class="sk-help">{{ fill(T().search.serviceAccountHelp, { property: d.property, account: d.serviceAccount }) }}</p> }</div>
            <button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
        } @else {
          <p class="sk-small">{{ fill(T().search.period, { from: date(d.start), to: date(d.end) }) }}</p>
          <sk-tile-groups [tiles]="tiles()" />
          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="T().search.impressionsChart" [barLabel]="T().search.barImpressions" [slots]="slots()" [bar]="series('impressions')" [prev]="previous('impressions')" />
            <sk-trend-chart [texts]="T()" [title]="T().search.clicksChart" [barLabel]="T().search.barClicks" [slots]="slots()" [bar]="series('clicks')" [prev]="previous('clicks')" />
          </div>

          <section class="sk-section" id="sk-queries">
            <h2>{{ T().search.sectionQueries }} <small>{{ T().search.sectionQueriesSub }}</small></h2>
            @if (d.brandTerms.length) {
              <div class="sk-seg" role="group" [attr.aria-label]="T().search.scope">
                <button type="button" [attr.aria-pressed]="scope() === 'all'" (click)="scope.set('all')">{{ T().search.scopeAll }}</button>
                <button type="button" [attr.aria-pressed]="scope() === 'brand'" (click)="scope.set('brand')">{{ T().search.scopeBrand }}</button>
                <button type="button" [attr.aria-pressed]="scope() === 'nonbrand'" (click)="scope.set('nonbrand')">{{ T().search.scopeNonBrand }}</button>
              </div>
            }
            <div class="sk-grid">
              <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.queriesTitle" [sub]="T().search.queriesSub" [head]="T().search.colQuery" [rows]="queryRows()" [cols]="perfCols()" [limit]="15" />
              <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.queryPagesTitle" [sub]="T().search.queryPagesSub" [head]="T().search.colQuery" [rows]="queryPageRows()" [cols]="plainCols()" [limit]="12" />
            </div>
          </section>

          <section class="sk-section" id="sk-opportunities">
            <h2>{{ T().search.sectionOpportunities }} <small>{{ T().search.sectionOpportunitiesSub }}</small></h2>
            <div class="sk-grid">
              @for (b of opportunities(); track b.id) { <sk-metric-table [texts]="T()" [title]="b.title" [sub]="b.sub" [head]="b.head" [rows]="b.rows" [cols]="b.cols" [limit]="8" /> }
            </div>
          </section>

          <section class="sk-section" id="sk-gpages">
            <h2>{{ T().search.sectionPages }} <small>{{ T().search.sectionPagesSub }}</small></h2>
            <sk-metric-table [texts]="T()" [title]="T().search.pagesTitle" [head]="T().search.colPage" [rows]="pageRows()" [cols]="perfCols()" [limit]="15" />
          </section>

          <section class="sk-section" id="sk-gaudience">
            <h2>{{ T().search.sectionAudience }} <small>{{ T().search.sectionAudienceSub }}</small></h2>
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().search.countriesTitle" [head]="T().search.colCountry" [rows]="countryRows()" [cols]="perfCols()" [limit]="10" />
              <sk-metric-table [texts]="T()" [title]="T().search.devicesTitle" [head]="T().search.colDevice" [rows]="deviceRows()" [cols]="perfCols()" />
              @if (d.appearance.length) { <sk-metric-table [texts]="T()" [title]="T().search.appearanceTitle" [sub]="T().search.appearanceSub" [head]="T().search.colType" [rows]="rows(d.appearance, null)" [cols]="plainCols()" /> }
            </div>
          </section>

          <section class="sk-section" id="sk-index">
            <h2>{{ T().search.sectionIndex }}</h2>
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().search.sitemapsTitle" [sub]="T().search.sitemapsSub" [head]="T().search.colFile" [rows]="sitemapRows()" [cols]="sitemapCols()" [limit]="5" [empty]="T().search.sitemapsEmpty" />
              @if (indexation(); as ix) {
                @if (ix.status === 'ok') {
                  <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.indexationTitle" [sub]="fill(T().search.indexationSub, { indexed: ix.indexed, total: ix.total, when: date(ix.checkedAt, true) })" [head]="T().search.colPage" [rows]="indexRows()" [cols]="indexCols()" [limit]="10" />
                } @else {
                  <div class="sk-status sk-status--err" role="alert">{{ T().search.indexationError }}</div>
                }
              } @else {
                <section class="sk-card">
                  <h2>{{ T().search.indexationTitle }}</h2>
                  <p class="sk-sub">{{ T().search.indexationHelp }}</p>
                  <p style="margin-top:.75rem"><button type="button" class="sk-btn" (click)="checkIndexation()" [disabled]="checking()">{{ checking() ? T().search.indexationRunning : T().search.indexationRun }}</button></p>
                </section>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class SkSearchConsole {
  private readonly api = inject(StatsKitApi);
  private readonly doc = inject(DOCUMENT);
  private readonly options = injectOptions();

  /** API address (default: the one of `provideStatsKit`). Changing it reloads the page: no need to recreate it. */
  readonly apiUrl = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly texts = input<TextOverrides | null>(null);
  readonly presets = input<number[]>([7, 28, 90, 365]);
  readonly initialDays = input(28);
  readonly theme = input<ThemeChoice>('auto');
  /** Page title: `h1`, `h2` (inside a page that has its own `h1`) or `none` (default: the `heading` option, then `h1`). */
  readonly heading = input<HeadingLevel | null>(null);

  protected readonly mode = resolvedMode(this.theme);
  protected readonly T = computed(() => resolveTexts(this.options, this.locale(), this.texts()));
  protected readonly fill = fill;
  private readonly base = computed(() => this.apiUrl() || this.options.apiUrl);
  protected readonly level = computed<HeadingLevel>(() => this.heading() ?? this.options.heading ?? 'h1');

  protected readonly days = signal(28);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  readonly data = signal<SearchOverview | null>(null);
  readonly indexation = signal<IndexationResponse | null>(null);
  protected readonly checking = signal(false);
  readonly scope = signal<Scope>('all');

  constructor() {
    // first load, then a new one each time the source changes (server rendering: nothing to load)
    loadOnSource(this.base, (first) => {
      if (first) this.days.set(this.initialDays());
      else (this.data.set(null), this.indexation.set(null));
      void this.load();
    });
  }

  protected readonly ok = computed(() => this.data()?.status === 'ok');
  protected date(v: string, withYear = false): string {
    return shortDate(this.T(), v, 'UTC', withYear);
  }
  private fmt(v: number, d = 0): string {
    return formatNumber(this.T(), v, d);
  }

  protected choose(days: number): void {
    this.days.set(days);
    void this.load();
  }
  async load(): Promise<void> {
    const base = this.base();
    this.loading.set(true);
    this.failed.set(false);
    try {
      const d = await this.api.get<SearchOverview>(base, '/search', { days: this.days() });
      if (base !== this.base()) return; // answer of the previous source: the new one is loading
      this.data.set(d);
    } catch {
      if (base !== this.base()) return;
      this.data.set(null);
      this.failed.set(true);
    }
    this.loading.set(false);
  }
  async checkIndexation(): Promise<void> {
    this.checking.set(true);
    try {
      this.indexation.set(await this.api.get<IndexationResponse>(this.base(), '/search/indexation'));
    } catch {
      this.indexation.set({ version: 1, status: 'error', error: null, checkedAt: new Date().toISOString(), total: 0, indexed: 0, pages: [] });
    }
    this.checking.set(false);
  }
  protected print(): void {
    this.doc.defaultView?.print();
  }

  /* ---------------------------------------------------------------- charts */
  protected readonly slots = computed(() => (this.data()?.series ?? []).map((x) => x.date));
  protected series(k: 'clicks' | 'impressions'): number[] {
    return (this.data()?.series ?? []).map((x) => x[k]);
  }
  protected previous(k: 'clicks' | 'impressions'): number[] {
    return (this.data()?.previousSeries ?? []).map((x) => x[k]);
  }

  /* ---------------------------------------------------------------- tiles */
  readonly tiles = computed<TileData[]>(() => {
    const d = this.data();
    if (!d || d.status !== 'ok') return [];
    const T = this.T(), G = T.search;
    const t = d.totals, b = d.previous;
    const line = (k: 'clicks' | 'impressions' | 'ctr' | 'position') => sparkPath(d.series.map((x) => x[k]));
    const visible = d.queries.filter((q) => q.impressions > 0);
    const brand = d.brandTerms.length ? d.queries.filter((q) => isBrand(q.key, d.brandTerms)).reduce((n, q) => n + q.clicks, 0) : null;
    const last7 = d.series.slice(-7), before7 = d.series.slice(-14, -7);
    const s7 = (rows: typeof last7, k: 'clicks' | 'impressions') => rows.reduce((n, x) => n + x[k], 0);
    const C = G.groupClicks, V = G.groupVisibility;
    const out: TileData[] = [
      { id: 'clicks', group: C, label: G.clicks, value: this.fmt(t.clicks), change: delta(T, t.clicks, b.clicks), sub: fill(T.common.perDay, { n: this.fmt(t.clicks / Math.max(1, d.days), 1) }), spark: line('clicks') },
      { id: 'ctr', group: C, label: G.ctr, value: formatPercent(T, t.ctr), change: b.impressions ? gap(T, t.ctr * 100, b.ctr * 100, false, 1, 'points') : null, sub: '', spark: line('ctr') },
      { id: 'impressions', group: V, label: G.impressions, value: this.fmt(t.impressions), change: delta(T, t.impressions, b.impressions), sub: fill(T.common.perDay, { n: this.fmt(t.impressions / Math.max(1, d.days), 1) }), spark: line('impressions') },
      { id: 'position', group: V, label: G.position, value: t.impressions ? this.fmt(t.position, 1) : '—', change: t.impressions && b.impressions ? gap(T, t.position, b.position, true, 1) : null, sub: T.common.lowerIsBetter, spark: '' },
      { id: 'queries', group: V, label: G.queriesCount, value: this.fmt(visible.length), change: delta(T, visible.length, d.previousQueries.filter((q) => q.impressions > 0).length), sub: fill(G.firstPage, { n: this.fmt(visible.filter((q) => q.position <= 10).length) }), spark: '' },
      { id: 'pages', group: V, label: G.visiblePages, value: this.fmt(d.pages.filter((x) => x.impressions > 0).length), change: delta(T, d.pages.length, d.previousPages.length), sub: '', spark: '' },
    ];
    if (brand !== null) {
      out.push({ id: 'brand', group: C, label: G.brandClicks, value: t.clicks ? formatPercent(T, brand / t.clicks, 0) : '—', change: null, sub: fill(G.brandClicksSub, { n: this.fmt(brand) }), spark: '' });
      out.push({ id: 'nonbrand', group: C, label: G.nonBrandClicks, value: this.fmt(Math.max(0, t.clicks - brand)), change: null, sub: G.nonBrandSub, spark: '' });
    }
    if (before7.length === 7) {
      out.push({ id: 'last7c', group: G.groupRecent, label: G.last7Clicks, value: this.fmt(s7(last7, 'clicks')), change: delta(T, s7(last7, 'clicks'), s7(before7, 'clicks')), sub: G.vsPrevious7, spark: '' });
      out.push({ id: 'last7i', group: G.groupRecent, label: G.last7Impressions, value: this.fmt(s7(last7, 'impressions')), change: delta(T, s7(last7, 'impressions'), s7(before7, 'impressions')), sub: G.vsPrevious7, spark: '' });
    }
    const maps = d.sitemaps ?? [];
    if (maps.length) out.push({ id: 'sitemap', group: G.groupIndex, label: G.sitemapPages, value: this.fmt(maps.reduce((n, m) => n + m.submitted, 0)), change: null, sub: fill(G.sitemapSub, { n: maps.reduce((n, m) => n + m.errors, 0) }), spark: '' });
    const ix = this.indexation();
    if (ix?.status === 'ok') out.push({ id: 'indexed', group: G.groupIndex, label: G.indexedPages, value: `${this.fmt(ix.indexed)} / ${this.fmt(ix.total)}`, change: null, sub: ix.total ? fill(G.indexedSub, { p: formatPercent(T, ix.indexed / ix.total, 0) }) : '', spark: '' });
    return out;
  });

  /* ---------------------------------------------------------------- tables */
  protected readonly perfCols = computed<Col[]>(() => {
    const G = this.T().search;
    return [
      { key: 'clicks', label: G.colClicks, delta: true }, { key: 'impressions', label: G.colImpressions, delta: true },
      { key: 'ctr', label: G.colCtr, kind: 'pct', delta: true }, { key: 'position', label: G.colPosition, kind: 'pos', delta: true, lowerBetter: true },
    ];
  });
  protected readonly plainCols = computed<Col[]>(() => this.perfCols().map((c) => ({ ...c, delta: false })));
  protected readonly sitemapCols = computed<Col[]>(() => {
    const G = this.T().search;
    return [{ key: 'submitted', label: G.colSubmitted }, { key: 'indexed', label: G.colIndexed }, { key: 'problems', label: G.colProblems }, { key: 'read', label: G.colRead, kind: 'text' }];
  });
  protected readonly indexCols = computed<Col[]>(() => [{ key: 'state', label: this.T().search.colState, kind: 'text' }, { key: 'crawl', label: this.T().search.colCrawl, kind: 'text' }]);

  private label(key: string, kind: 'query' | 'page' | 'country' | 'device' | null): Pick<MRow, 'label' | 'sub' | 'href'> {
    if (kind === 'page') return { label: pathOf(key), href: key };
    if (kind === 'country') return { label: countryName(this.T(), key) };
    if (kind === 'device') return { label: this.T().searchDevices[key] ?? key };
    return { label: key };
  }
  protected rows(list: SearchRow[], prev: SearchRow[] | null, kind: 'query' | 'page' | 'country' | 'device' | null = null): MRow[] {
    const before = prev ? byKey(prev) : null;
    return list.map((r) => {
      const p = before?.get(r.key);
      return { ...this.label(r.key, kind), values: { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.impressions ? r.position : null }, prev: before ? (p ? { clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position } : { clicks: 0, impressions: 0 }) : undefined };
    });
  }
  private readonly scoped = computed(() => {
    const d = this.data();
    const s = this.scope();
    const keep = (q: SearchRow) => s === 'all' || (s === 'brand') === isBrand(q.key, d?.brandTerms ?? []);
    return { queries: (d?.queries ?? []).filter(keep), previous: (d?.previousQueries ?? []).filter(keep) };
  });
  protected readonly queryRows = computed(() => this.rows(this.scoped().queries, this.scoped().previous, 'query'));
  protected readonly queryPageRows = computed<MRow[]>(() => (this.data()?.queryPages ?? []).filter((r) => this.scope() === 'all' || (this.scope() === 'brand') === isBrand(r.query, this.data()!.brandTerms)).map((r) => ({ label: r.query, sub: pathOf(r.page), values: { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position } })));
  protected readonly pageRows = computed(() => this.rows(this.data()?.pages ?? [], this.data()?.previousPages ?? [], 'page'));
  protected readonly countryRows = computed(() => this.rows(this.data()?.countries ?? [], this.data()?.previousCountries ?? [], 'country'));
  protected readonly deviceRows = computed(() => this.rows(this.data()?.devices ?? [], this.data()?.previousDevices ?? [], 'device'));
  protected readonly sitemapRows = computed<MRow[]>(() => (this.data()?.sitemaps ?? []).map((m) => ({ label: pathOf(m.path), href: m.path, values: { submitted: m.submitted, indexed: m.indexed, problems: m.errors + m.warnings, read: m.lastDownloaded ? this.date(m.lastDownloaded, true) : '—' } })));
  protected readonly indexRows = computed<MRow[]>(() => (this.indexation()?.pages ?? []).map((p) => ({ label: pathOf(p.url), href: p.url, values: { state: p.state, crawl: p.lastCrawl ? this.date(p.lastCrawl, true) : '—' } })));

  protected readonly opportunities = computed(() => {
    const d = this.data();
    if (!d) return [];
    const G = this.T().search;
    const q = this.scoped();
    const pos: Col = { key: 'position', label: G.colPosition, kind: 'pos' };
    const moverCols: Col[] = [{ key: 'impressions', label: G.colImpressions }, { key: 'before', label: G.colBefore }, { key: 'diff', label: G.colDiff }, pos];
    const m = (dir: 'up' | 'down') => movers(q.queries, q.previous, dir).map((r) => ({ label: r.key, values: { impressions: r.impressions, before: r.before, diff: r.diff, position: r.impressions ? r.position : null } }));
    return [
      { id: 'potential', title: G.potentialTitle, sub: G.potentialSub, head: G.colQuery, cols: [{ key: 'impressions', label: G.colImpressions }, pos, { key: 'clicks', label: G.colClicks }, { key: 'gain', label: G.colGain, tip: G.colGainTip }] as Col[], rows: potential(q.queries).map((r) => ({ label: r.key, values: { impressions: r.impressions, position: r.position, clicks: r.clicks, gain: r.gain } })) },
      { id: 'up', title: G.upTitle, sub: G.upSub, head: G.colQuery, cols: moverCols, rows: m('up') },
      { id: 'down', title: G.downTitle, sub: G.downSub, head: G.colQuery, cols: moverCols, rows: m('down') },
      { id: 'new', title: G.newTitle, sub: G.newSub, head: G.colQuery, cols: this.plainCols(), rows: this.rows(newQueries(q.queries, q.previous), null, 'query') },
      { id: 'low-ctr', title: G.lowCtrTitle, sub: G.lowCtrSub, head: G.colPage, cols: this.plainCols(), rows: this.rows(lowCtrPages(d.pages), null, 'page') },
      { id: 'lost', title: G.lostTitle, sub: G.lostSub, head: G.colPage, cols: [{ key: 'before', label: G.colClicksBefore }, { key: 'impressions', label: G.colImpressions }, pos] as Col[], rows: lostPages(d.pages, d.previousPages).map((r) => ({ label: pathOf(r.key), href: r.key, values: { before: r.before, impressions: r.impressions, position: r.impressions ? r.position : null } })) },
      { id: 'cannibal', title: G.cannibalTitle, sub: G.cannibalSub, head: G.colQuery, cols: [{ key: 'pages', label: G.colPages }, { key: 'impressions', label: G.colImpressions }, { key: 'clicks', label: G.colClicks }] as Col[], rows: cannibalization(d.queryPages).map((r) => ({ label: r.key, sub: r.urls.map(pathOf).join(' · '), values: { pages: r.pages, impressions: r.impressions, clicks: r.clicks } })) },
    ];
  });

  csvRows(): (string | number | null)[][] {
    const G = this.T().search;
    const out: (string | number | null)[][] = [[this.T().stats.csvSection, this.T().stats.csvLabel, G.colClicks, G.colImpressions, G.colCtr, G.colPosition]];
    const d = this.data()!;
    const add = (section: string, list: SearchRow[]) => list.forEach((r) => out.push([section, r.key, r.clicks, r.impressions, r.ctr, r.position]));
    add(this.T().common.total, [{ key: fill(this.T().periods.short, { from: d.start, to: d.end }), ...d.totals }]);
    add(G.barImpressions, d.series.map((x) => ({ key: x.date, ...x })));
    add(G.queriesTitle, d.queries);
    add(G.pagesTitle, d.pages);
    add(G.countriesTitle, d.countries);
    add(G.devicesTitle, d.devices);
    return out;
  }
  exportCsv(): void {
    download(this.doc, `${fill(this.T().search.csvFile, { days: this.days() })}.csv`, toCsv(this.csvRows(), csvSeparator(this.T())));
  }
}
