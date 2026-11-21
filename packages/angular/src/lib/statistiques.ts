/*
 * Page « Statistiques » complète : direct, tuiles avec évolutions, graphique de la période (et période précédente), entonnoir,
 * carte du monde et pays, dernières 24 heures, carte de chaleur, classements triables et exportables (pages, sources, audience,
 * actions, données du site), dernières sessions, export CSV global, impression, aperçu et envoi du rapport.
 */
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, PLATFORM_ID, computed, inject, input, signal, type OnInit } from '@angular/core';
import {
  bestSlot, browserName, capitalize, channelName, countryName, delta, deviceName, fill, formatDuration, formatNumber, formatPercent, gap, languageName,
  plural, rangeText, regionName, slotLabel, sparkPath, toCsv, longDay,
  type Item, type LiveResponse, type ReportPreview, type ReportSendResult, type Section, type StatsOverview, type TextOverrides, type Totals,
} from 'stats-kit/contrat';
import { SkHeatmap, SkMetricTable, SkTileGroups, SkTrendChart, type Col, type MRow, type TileData } from './blocs';
import { SkWorldMap } from './carte';
import { StatsKitApi, download, injectOptions, resolveTexts } from './config';
import { LAYOUT, TOKENS, resolvedMode, type ThemeChoice } from './theme';

interface Block { id: string; section: Section; title: string; sub?: string; head: string; cols: Col[]; rows: MRow[]; limit?: number }

const today = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'sk-statistiques',
  imports: [SkTileGroups, SkMetricTable, SkTrendChart, SkWorldMap, SkHeatmap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-sk-mode]': 'mode()' },
  styles: [TOKENS, LAYOUT, `
    .sk-live { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; }
    .sk-badge { display: inline-flex; align-items: center; gap: .45rem; padding: .25rem .7rem; border-radius: 999px; font-size: .82rem; font-weight: 600; background: var(--k-up-soft); color: var(--k-up); }
    .sk-badge i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: sk-pulse 2s ease-in-out infinite; }
    .sk-badge--stale { background: var(--k-warn-soft); color: var(--k-warn); }
    .sk-badge--stale i { animation: none; }
    @media (prefers-reduced-motion: reduce) { .sk-badge i { animation: none; } }
    @keyframes sk-pulse { 50% { opacity: .35; } }
    .sk-pause { width: 34px; height: 34px; display: inline-grid; place-items: center; font-size: .65rem; color: var(--k-ink2); background: var(--k-card); border: 1px solid var(--k-line2); border-radius: 50%; cursor: pointer; }
    .sk-pause:hover { color: var(--k-brand); border-color: var(--k-brand); }
    .sk-pause:focus-visible { outline: 2px solid var(--k-brand); outline-offset: 2px; }
    .sk-geo { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr); gap: var(--k-gap); align-items: start; }
    @media (max-width: 1000px) { .sk-geo { grid-template-columns: minmax(0, 1fr); } }
    .sk-map-card { display: grid; gap: .75rem; }
    .sk-map-card__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem 1rem; }
    .sk-legend { display: inline-flex; align-items: center; gap: .5rem; font-size: .76rem; font-weight: 600; color: var(--k-ink2); }
    .sk-legend i { width: 96px; height: 10px; border-radius: 5px; background: linear-gradient(90deg, var(--k-map-lo), var(--k-map-hi)); }
    .sk-funnel { display: grid; gap: 1rem; margin: .75rem 0 0; padding: 0; list-style: none; }
    .sk-funnel li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .25rem .75rem; align-items: baseline; font-size: .875rem; }
    .sk-funnel__label { font-weight: 600; }
    .sk-funnel__val { text-align: right; }
    .sk-funnel__val b { font-size: 1.05rem; font-variant-numeric: tabular-nums; }
    .sk-funnel small { display: block; color: var(--k-muted); font-size: .76rem; font-weight: 500; }
    .sk-funnel__bar { grid-column: 1 / -1; position: relative; height: 10px; border-radius: 5px; background: var(--k-track); overflow: hidden; }
    .sk-funnel__bar::after { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--w); border-radius: 5px; background: var(--k-c1); }
    .sk-hint { margin-top: .75rem; font-size: .78rem; color: var(--k-muted); }
    .sk-sessions { padding: 1rem; }
    .sk-sessions table { width: 100%; border-collapse: collapse; font-size: .875rem; margin-top: .75rem; }
    .sk-sessions th, .sk-sessions td { padding: .5rem .5rem; text-align: left; border-bottom: 1px solid var(--k-line); }
    .sk-sessions thead th { font-size: .76rem; color: var(--k-muted); }
    .sk-sessions .sk-num { text-align: right; font-variant-numeric: tabular-nums; }
    .sk-sessions tbody tr:last-child > * { border-bottom: 0; }
    @media (max-width: 700px) {
      .sk-sessions thead { display: none; }
      .sk-sessions tr { display: grid; grid-template-columns: 1fr auto; padding: .5rem 0; border-bottom: 1px solid var(--k-line); }
      .sk-sessions td { border: 0; padding: .1rem 0; }
      .sk-sessions td[data-label]::before { content: attr(data-label) ' : '; color: var(--k-muted); font-size: .76rem; }
      .sk-sessions .sk-num { text-align: left; }
      .sk-pause { width: 44px; height: 44px; }
    }
    @media print { .sk-geo, .sk-twin { break-inside: avoid; } .sk-funnel__bar, .sk-funnel__bar::after { print-color-adjust: exact; } }
  `],
  template: `
    <div class="sk-page">
      <header class="sk-head">
        <h1>{{ T().stats.title }}</h1>
        @if (T().stats.lead) { <p class="sk-lead">{{ T().stats.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-group">
            <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
              @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="!custom() && days() === p" (click)="choose(p)">{{ p === 1 ? T().periods.h24 : fill(T().periods.days, { n: p }) }}</button> }
              <button type="button" [attr.aria-pressed]="custom()" (click)="openCustom()">{{ T().periods.custom }}</button>
            </div>
            @if (custom()) {
              <span class="sk-group">
                <label class="sk-field">{{ T().periods.from }} <input type="date" [value]="from()" [max]="today" (change)="from.set($any($event.target).value)" /></label>
                <label class="sk-field">{{ T().periods.to }} <input type="date" [value]="to()" [max]="today" (change)="to.set($any($event.target).value)" /></label>
                <button type="button" class="sk-btn sk-btn--primary" (click)="run()" [disabled]="!from()">{{ T().periods.apply }}</button>
              </span>
            }
          </div>
          @if (data(); as d) {
            <div class="sk-group">
              @if (d.dashboardUrl) { <a class="sk-btn" [href]="d.dashboardUrl" target="_blank" rel="noopener">{{ T().stats.openDashboard }}</a> }
              <button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button>
              <button type="button" class="sk-btn" (click)="print()">{{ T().common.print }}</button>
              @if (report()) {
                <button type="button" class="sk-btn" (click)="previewReport()" [disabled]="reporting()">{{ T().stats.previewReport }}</button>
                <button type="button" class="sk-btn" (click)="sendReport()" [disabled]="reporting()">{{ T().stats.sendReport }}</button>
              }
            </div>
          }
        </div>
      </header>

      @if (message(); as m) { <p class="sk-status" [class.sk-status--ok]="m.ok" [class.sk-status--err]="!m.ok" role="status">{{ m.text }}</p> }

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="run()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().stats.notConfiguredTitle }}</b>{{ T().stats.notConfiguredHelp }}</div></div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().stats.errorTitle }}</b>{{ T().stats.errorHelp }}</div><button type="button" class="sk-btn" (click)="run()">{{ T().common.retry }}</button></div>
        }

        @if (ok()) {
          <div class="sk-toolbar">
            <div class="sk-live">
              @if (stale()) {
                <span class="sk-badge sk-badge--stale" [title]="T().stats.liveStaleHelp"><i></i>{{ T().stats.liveStale }}</span>
              } @else {
                <span class="sk-badge" aria-live="polite"><i></i>{{ plural(T(), active() ?? 0, T().stats.liveOne, T().stats.liveOther) }}</span>
              }
              <button type="button" class="sk-pause sk-noprint" (click)="auto.set(!auto())" [attr.aria-label]="auto() ? T().stats.pause : T().stats.resume" [attr.aria-pressed]="!auto()" [title]="auto() ? T().stats.pause : T().stats.resume">{{ auto() ? '❚❚' : '▶' }}</button>
              <span class="sk-small">{{ updated() }} · {{ range() }}</span>
            </div>
            <nav class="sk-jump" [attr.aria-label]="T().common.jumpTo">
              <a href="#sk-pages" (click)="jump($event, 'sk-pages')">{{ T().stats.sectionPages }}</a>
              <a href="#sk-sources" (click)="jump($event, 'sk-sources')">{{ T().stats.sectionSources }}</a>
              <a href="#sk-audience" (click)="jump($event, 'sk-audience')">{{ T().stats.sectionAudience }}</a>
              <a href="#sk-actions" (click)="jump($event, 'sk-actions')">{{ T().stats.sectionActions }}</a>
              <a href="#sk-sessions" (click)="jump($event, 'sk-sessions')">{{ T().stats.sectionSessions }}</a>
            </nav>
          </div>
        }

        @if (tiles().length) { <sk-tile-groups [tiles]="tiles()" /> }

        @if (ok()) {
          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="d.series.unit === 'hour' ? T().stats.trafficHourly : T().stats.trafficDaily" [barLabel]="T().stats.pageviews" [lineLabel]="T().stats.visitors"
              [slots]="d.series.slots" [unit]="d.series.unit" [bar]="d.series.pageviews" [line]="d.series.visitors" [prev]="d.series.previousPageviews ?? []" [foot]="bestDay()" />
            <section class="sk-card">
              <h2>{{ T().stats.funnelTitle }}</h2>
              <p class="sk-sub">{{ T().stats.funnelSub }}</p>
              <ol class="sk-funnel">
                @for (s of funnel(); track s.label) {
                  <li [style.--w]="s.w"><span class="sk-funnel__label">{{ s.label }}</span><span class="sk-funnel__val"><b>{{ s.value }}</b>@if (s.note) { <small>{{ s.note }}</small> }</span><span class="sk-funnel__bar" aria-hidden="true"></span></li>
                }
              </ol>
              @if (d.totals.visitors < 30) { <p class="sk-hint">{{ T().stats.fewVisitors }}</p> }
            </section>
          </div>

          <div class="sk-geo">
            <section class="sk-card sk-map-card">
              <div class="sk-map-card__head">
                <h2>{{ T().stats.mapTitle }}</h2>
                @if (mapMax()) { <span class="sk-legend" aria-hidden="true"><span>1</span><i></i><span>{{ fill(T().stats.mapLegend, { n: fmt(mapMax()) }) }}</span></span> }
              </div>
              <sk-world-map [texts]="T()" [countries]="d.breakdowns.countries" [worldUrl]="worldUrl()" />
            </section>
            <sk-metric-table [texts]="T()" [title]="T().stats.countriesTitle" [head]="T().stats.colCountry" [rows]="countryRows()" [cols]="visitsDelta()" [limit]="12" />
          </div>

          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="T().stats.last24h" [barLabel]="T().stats.pageviews" [lineLabel]="T().stats.visitors" [slots]="d.last24h.slots" unit="hour"
              [bar]="d.last24h.pageviews" [line]="d.last24h.visitors" [foot]="fill(T().stats.last24hFoot, { n: fmt(sum(d.last24h.pageviews)) })" />
            <section class="sk-card">
              <h2>{{ T().stats.heatTitle }}</h2>
              <p class="sk-sub">{{ slotText() }} · {{ fill(T().stats.heatSub, { tz: d.range.timeZone }) }}</p>
              <sk-heatmap [texts]="T()" [grid]="d.heatmap" [summary]="slotText()" style="margin-top:.6rem" />
            </section>
          </div>

          <p class="sk-small">{{ T().stats.tablesHint }}</p>
        }

        @for (s of sections(); track s.id) {
          @if (s.blocks.length) {
            <section class="sk-section" [id]="'sk-' + s.id">
              <h2>{{ s.title }} <small>{{ s.sub }}</small></h2>
              <div class="sk-grid">@for (b of s.blocks; track b.id) { <sk-metric-table [texts]="T()" [title]="b.title" [sub]="b.sub ?? ''" [head]="b.head" [rows]="b.rows" [cols]="b.cols" [limit]="b.limit ?? 10" /> }</div>
            </section>
          }
        }

        @if (ok()) {
          <section class="sk-card sk-sessions" id="sk-sessions">
            <h2>{{ T().stats.sessionsTitle }}</h2>
            <p class="sk-sub">{{ T().stats.sessionsSub }}</p>
            @if (sessionRows().length) {
              <table>
                <thead><tr><th scope="col">{{ T().stats.sessionsPlace }}</th><th scope="col">{{ T().stats.sessionsDevice }}</th><th scope="col" class="sk-num">{{ T().stats.sessionsPages }}</th><th scope="col">{{ T().stats.sessionsWhen }}</th></tr></thead>
                <tbody>@for (x of sessionRows(); track $index) { <tr><td>{{ x.place }}</td><td [attr.data-label]="T().stats.sessionsDevice">{{ x.tech }}</td><td class="sk-num" [attr.data-label]="T().stats.sessionsPages">{{ x.views }}</td><td [attr.data-label]="T().stats.sessionsWhen">{{ x.when }}</td></tr> }</tbody>
              </table>
            } @else {
              <div class="sk-empty"><b>{{ T().stats.sessionsEmptyTitle }}</b>{{ T().stats.sessionsEmpty }}</div>
            }
          </section>
        }
      }
    </div>
  `,
})
export class SkStatistiques implements OnInit {
  private readonly api = inject(StatsKitApi);
  private readonly doc = inject(DOCUMENT);
  private readonly options = injectOptions();

  /** Adresse de l'API (défaut : celle de `provideStatsKit`). */
  readonly apiUrl = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly texts = input<TextOverrides | null>(null);
  /** Périodes proposées, en jours (1 = 24 heures). */
  readonly presets = input<number[]>([1, 7, 30, 90]);
  readonly initialDays = input(30);
  /** Boutons d'aperçu et d'envoi du rapport. */
  readonly report = input(true);
  /** Clair, sombre, ou selon le système. */
  readonly theme = input<ThemeChoice>('auto');
  /** Actualisation du direct et de la page (millisecondes ; 0 pour ne pas actualiser). */
  readonly liveMs = input(30_000);
  readonly refreshMs = input(120_000);
  /** Adresse du fond de carte (défaut : `{apiUrl}/world.json`). */
  readonly worldUrl = input<string | null>(null);

  protected readonly mode = resolvedMode(this.theme);
  protected readonly T = computed(() => resolveTexts(this.options, this.locale(), this.texts()));
  protected readonly fill = fill;
  protected readonly plural = plural;
  protected readonly today = today();
  private readonly base = computed(() => this.apiUrl() ?? this.options.apiUrl);

  protected readonly days = signal(30);
  protected readonly custom = signal(false);
  protected readonly from = signal('');
  protected readonly to = signal(today());
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  readonly data = signal<StatsOverview | null>(null);
  protected readonly active = signal<number | null>(null);
  protected readonly stale = signal(false);
  protected readonly auto = signal(true);
  protected readonly now = signal(Date.now());
  protected readonly reporting = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  private readonly destroy = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    if (!this.browser) return; // rendu serveur : rien à charger, la page se remplit dans le navigateur
    this.days.set(this.initialDays());
    void this.run();
    const timers: ReturnType<typeof setInterval>[] = [];
    if (this.liveMs() > 0) timers.push(setInterval(() => { this.now.set(Date.now()); if (this.canRefresh()) void this.refreshLive(); }, this.liveMs()));
    if (this.refreshMs() > 0) timers.push(setInterval(() => { if (this.canRefresh()) void this.fetch(true); }, this.refreshMs()));
    const visible = () => { if (this.canRefresh()) void this.refreshLive(); };
    this.doc.addEventListener('visibilitychange', visible);
    this.destroy.onDestroy(() => (timers.forEach(clearInterval), this.doc.removeEventListener('visibilitychange', visible)));
  }
  private canRefresh(): boolean {
    return this.auto() && !this.doc.hidden && !!this.data() && this.data()!.status === 'ok';
  }

  protected readonly ok = computed(() => this.data()?.status === 'ok');
  protected fmt(v: number, d = 0): string {
    return formatNumber(this.T(), v, d);
  }
  protected sum(v: number[]): number {
    return v.reduce((a, b) => a + b, 0);
  }
  protected readonly updated = computed(() => {
    const at = Date.parse(this.data()?.generatedAt ?? '') || this.now();
    const min = Math.floor(Math.max(0, this.now() - at) / 60_000);
    return min < 1 ? this.T().stats.updatedNow : fill(this.T().stats.updatedAgo, { n: min });
  });
  protected readonly range = computed(() => (this.data() ? rangeText(this.T(), this.data()!.range) : ''));
  protected readonly bestDay = computed(() => {
    const s = this.data()?.series;
    if (!s?.pageviews.length) return '';
    const i = s.pageviews.reduce((b, v, k) => (v > s.pageviews[b] ? k : b), 0);
    if (!s.pageviews[i]) return '';
    const label = s.unit === 'day' ? longDay(this.T(), s.slots[i]) : slotLabel(this.T(), s.slots[i], 'hour');
    return fill(this.T().stats.bestDay, { d: `${label} (${this.fmt(s.pageviews[i])})` });
  });
  protected readonly slotText = computed(() => {
    const b = bestSlot(this.data()?.heatmap);
    return b ? fill(this.T().stats.bestSlot, { day: this.T().weekdays[b.day], hour: b.hour }) : this.T().stats.notEnough;
  });
  protected readonly mapMax = computed(() => Math.max(0, ...(this.data()?.breakdowns.countries ?? []).map((c) => c.value)));

  /* ---------------------------------------------------------------- tuiles */
  readonly tiles = computed<TileData[]>(() => {
    const d = this.data();
    if (!d) return [];
    const T = this.T(), S = T.stats;
    const out: TileData[] = [];
    if (d.status === 'ok') {
      const s = d.totals, p = d.previous;
      const days = Math.max(1, d.range.days);
      const ratio = (t: Totals | null, a: keyof Totals, b: keyof Totals) => (t && t[b] ? t[a] / t[b] : 0);
      const spark = (v: number[]) => sparkPath(v);
      const A = S.groupAudience, E = S.groupEngagement;
      out.push(
        { id: 'visitors', group: A, label: S.visitors, value: this.fmt(s.visitors), change: p ? delta(T, s.visitors, p.visitors) : null, sub: fill(T.common.perDay, { n: this.fmt(s.visitors / days, 1) }), spark: spark(d.series.visitors) },
        { id: 'visits', group: A, label: S.visits, value: this.fmt(s.visits), change: p ? delta(T, s.visits, p.visits) : null, sub: s.visitors ? fill(S.perVisitor, { n: this.fmt(s.visits / s.visitors, 2) }) : '', spark: '' },
        { id: 'pageviews', group: A, label: S.pageviews, value: this.fmt(s.pageviews), change: p ? delta(T, s.pageviews, p.pageviews) : null, sub: fill(T.common.perDay, { n: this.fmt(s.pageviews / days, 1) }), spark: spark(d.series.pageviews) },
        { id: 'countries', group: A, label: S.countries, value: this.fmt(d.counts.countries ?? d.breakdowns.countries.length), change: null, sub: fill(S.citiesSub, { n: this.fmt(d.breakdowns.cities.length) }), spark: '' },
        { id: 'per-visit', group: E, label: S.pagesPerVisit, value: this.fmt(ratio(s, 'pageviews', 'visits'), 2), change: p ? delta(T, ratio(s, 'pageviews', 'visits'), ratio(p, 'pageviews', 'visits')) : null, sub: '', spark: '' },
        { id: 'bounce', group: E, label: S.bounceRate, value: s.visits ? formatPercent(T, ratio(s, 'bounces', 'visits'), 0) : '—', change: p?.visits ? gap(T, ratio(s, 'bounces', 'visits') * 100, ratio(p, 'bounces', 'visits') * 100, true, 0, ' pt') : null, sub: fill(S.bounceSub, { n: this.fmt(s.bounces) }), spark: '' },
        { id: 'duration', group: E, label: S.avgDuration, value: formatDuration(ratio(s, 'totaltime', 'visits')), change: p?.visits ? delta(T, ratio(s, 'totaltime', 'visits'), ratio(p, 'totaltime', 'visits')) : null, sub: S.perVisit, spark: '' },
        { id: 'engaged', group: E, label: S.engagedVisits, value: this.fmt(s.visits - s.bounces), change: p ? delta(T, s.visits - s.bounces, p.visits - p.bounces) : null, sub: s.visits ? fill(S.ofVisits, { p: formatPercent(T, (s.visits - s.bounces) / s.visits, 0) }) : '', spark: '' },
      );
      for (const g of d.goals) out.push({ id: `goal-${g.id}`, group: S.groupGoals, label: g.label, value: this.fmt(g.value), change: delta(T, g.value, g.previous), sub: s.visitors ? fill(S.ofVisitors, { p: formatPercent(T, g.value / s.visitors, 1) }) : '', spark: '' });
      const events = d.breakdowns.events;
      out.push({ id: 'events', group: S.groupGoals, label: S.events, value: this.fmt(d.counts.events ?? events.reduce((n, e) => n + e.value, 0)), change: null, sub: plural(T, events.length, S.eventTypesOne, S.eventTypesOther), spark: '' });
    }
    for (const x of d.extras?.tiles ?? []) {
      out.push({ id: `x-${x.id}`, group: x.group ?? S.groupSite, label: x.label, value: typeof x.value === 'number' ? this.fmt(x.value) : x.value, change: typeof x.value === 'number' && x.previous !== null ? delta(T, x.value, x.previous) : null, sub: x.sub ?? '', spark: '', highlight: x.highlight });
    }
    return out;
  });

  readonly funnel = computed(() => {
    const d = this.data();
    if (!d) return [];
    const T = this.T(), S = T.stats;
    const v = Math.max(1, d.totals.visitors);
    const engaged = d.totals.visits - d.totals.bounces;
    const goals = d.goals.reduce((n, g) => n + g.value, 0);
    const w = (n: number, of: number) => `${Math.min(100, Math.round((n / Math.max(1, of)) * 100))}%`;
    const out = [
      { label: S.funnelVisitors, value: this.fmt(d.totals.visitors), w: '100%', note: '' },
      { label: S.funnelEngaged, value: this.fmt(engaged), w: w(engaged, d.totals.visits), note: fill(S.ofVisits, { p: formatPercent(T, engaged / Math.max(1, d.totals.visits), 0) }) },
    ];
    if (d.goals.length) out.push({ label: S.funnelGoals, value: this.fmt(goals), w: w(goals, v), note: fill(S.ofVisitors, { p: formatPercent(T, goals / v, 1) }) });
    const last = d.extras?.funnel;
    if (last) {
      const before = d.goals.length ? goals : engaged;
      out.push({ label: last.label, value: this.fmt(last.value), w: w(last.value, v), note: before ? fill(S.funnelOfPrevious, { p: formatPercent(T, last.value / before, 0) }) : '' });
    }
    return out;
  });

  /* ---------------------------------------------------------------- tableaux */
  protected readonly visitsDelta = computed<Col[]>(() => [{ key: 'y', label: this.T().stats.colVisits, delta: true }, { key: 'share', label: this.T().common.share, kind: 'pct', tip: this.T().common.shareTip }]);

  private itemRows(items: Item[] | undefined, label: (key: string) => string): MRow[] {
    const list = items ?? [];
    const total = Math.max(1, list.reduce((n, p) => n + p.value, 0));
    return list.map((p) => {
      const l = p.label ?? label(p.key);
      return { label: l || '—', sub: p.label && p.label !== p.key && p.key.startsWith('/') ? p.key : undefined, values: { y: p.value, share: p.value / total }, prev: p.previous === null ? undefined : { y: p.previous } };
    });
  }
  protected readonly countryRows = computed(() => this.itemRows(this.data()?.breakdowns.countries, (k) => countryName(this.T(), k)));

  readonly blocks = computed<Block[]>(() => {
    const d = this.data();
    if (!d) return [];
    const T = this.T(), S = T.stats;
    const cols = (label: string, withDelta = false): Col[] => [{ key: 'y', label, delta: withDelta }, { key: 'share', label: T.common.share, kind: 'pct', tip: T.common.shareTip }];
    const visits = cols(S.colVisits), visitsD = cols(S.colVisits, true), views = cols(S.colPageviews), viewsD = cols(S.colPageviews, true);
    const out: Block[] = [];
    const add = (b: Block) => { if (b.rows.length || ['pages', 'entries', 'exits', 'referrers', 'events'].includes(b.id)) out.push(b); };
    const b = d.breakdowns;
    const page = (k: string) => k;
    if (d.status === 'ok') {
      if (d.pages.length) {
        const pr = d.pages;
        const lab = (x: { key: string; label: string | null }) => ({ label: x.label ?? x.key, sub: x.label && x.label !== x.key ? x.key : undefined });
        add({
          id: 'pages', section: 'pages', title: S.pagesTitle, sub: S.pagesSub, head: S.colPage, limit: 12,
          cols: [{ key: 'views', label: S.colViews, delta: true }, { key: 'visitors', label: S.colVisitors }, { key: 'entries', label: S.colEntries }, { key: 'exits', label: S.colExits }, { key: 'bounce', label: S.colBounce, kind: 'pct', lowerBetter: true }, { key: 'time', label: S.colTime, kind: 'dur' }],
          rows: pr.map((x) => ({ ...lab(x), values: { views: x.views, visitors: x.visitors, entries: x.entries, exits: x.exits, bounce: x.entries ? x.bounces / x.entries : null, time: x.views ? x.totaltime / x.views : null }, prev: x.previousViews === null ? undefined : { views: x.previousViews } })),
        });
        const entries = pr.filter((x) => x.entries > 0), et = Math.max(1, entries.reduce((n, x) => n + x.entries, 0));
        add({ id: 'entries', section: 'pages', title: S.entriesTitle, sub: S.entriesSub, head: S.colPage, cols: [{ key: 'entries', label: S.colEntries }, { key: 'bounce', label: S.colBounce, kind: 'pct', lowerBetter: true }, { key: 'share', label: T.common.share, kind: 'pct' }], rows: entries.map((x) => ({ ...lab(x), values: { entries: x.entries, bounce: x.bounces / x.entries, share: x.entries / et } })) });
        const exits = pr.filter((x) => x.exits > 0), xt = Math.max(1, exits.reduce((n, x) => n + x.exits, 0));
        add({ id: 'exits', section: 'pages', title: S.exitsTitle, sub: S.exitsSub, head: S.colPage, cols: [{ key: 'exits', label: S.colExits }, { key: 'share', label: T.common.share, kind: 'pct' }, { key: 'rate', label: S.colExitRate, kind: 'pct', lowerBetter: true, tip: S.colExitRateTip }], rows: exits.map((x) => ({ ...lab(x), values: { exits: x.exits, share: x.exits / xt, rate: x.views ? Math.min(1, x.exits / x.views) : null } })) });
      } else {
        add({ id: 'pages', section: 'pages', title: S.pagesTitle, head: S.colPage, cols: viewsD, rows: this.itemRows(b.pages, page), limit: 12 });
        add({ id: 'entries', section: 'pages', title: S.entriesTitle, sub: S.entriesSub, head: S.colPage, cols: visits, rows: this.itemRows(b.entries, page) });
        add({ id: 'exits', section: 'pages', title: S.exitsTitle, sub: S.exitsSub, head: S.colPage, cols: visits, rows: this.itemRows(b.exits, page) });
      }
      for (const g of d.groups) add({ id: `group-${g.id}`, section: 'pages', title: g.title, head: S.colItem, cols: viewsD, rows: this.itemRows(g.items, (k) => k.replace(/-/g, ' ')) });

      add({ id: 'channels', section: 'sources', title: S.channelsTitle, sub: S.channelsSub, head: S.colChannel, cols: visitsD, rows: this.itemRows(b.channels, (k) => channelName(T, k)) });
      add({ id: 'referrers', section: 'sources', title: S.referrersTitle, sub: S.referrersSub, head: S.colSource, cols: visitsD, rows: this.itemRows(b.referrers, (k) => k || T.common.direct), limit: 12 });
      add({ id: 'utm-campaigns', section: 'sources', title: S.utmCampaignsTitle, head: S.colCampaign, cols: visits, rows: this.itemRows(b.utmCampaigns, page) });
      add({ id: 'utm-sources', section: 'sources', title: S.utmSourcesTitle, head: S.colSource, cols: visits, rows: this.itemRows(b.utmSources, page) });
      add({ id: 'utm-mediums', section: 'sources', title: S.utmMediumsTitle, head: S.colMedium, cols: visits, rows: this.itemRows(b.utmMediums, page) });
      add({ id: 'hostnames', section: 'sources', title: S.hostnamesTitle, head: S.colAddress, cols: visits, rows: this.itemRows(b.hostnames, page) });

      add({ id: 'regions', section: 'audience', title: S.regionsTitle, head: S.colRegion, cols: visits, rows: this.itemRows(b.regions, (k) => regionName(T, k)), limit: 8 });
      add({ id: 'cities', section: 'audience', title: S.citiesTitle, head: S.colCity, cols: visits, rows: this.itemRows(b.cities, page), limit: 12 });
      add({ id: 'site-languages', section: 'audience', title: S.siteLanguagesTitle, head: S.colLanguage, cols: viewsD, rows: this.itemRows(b.siteLanguages, (k) => languageName(T, k)) });
      add({ id: 'languages', section: 'audience', title: S.languagesTitle, head: S.colLanguage, cols: visits, rows: this.itemRows(b.languages, (k) => languageName(T, k)) });
      add({ id: 'devices', section: 'audience', title: S.devicesTitle, head: S.colDevice, cols: visits, rows: this.itemRows(b.devices, (k) => deviceName(T, k)) });
      add({ id: 'browsers', section: 'audience', title: S.browsersTitle, head: S.colBrowser, cols: visits, rows: this.itemRows(b.browsers, browserName) });
      add({ id: 'os', section: 'audience', title: S.osTitle, head: S.colSystem, cols: visits, rows: this.itemRows(b.os, capitalize) });
      add({ id: 'screens', section: 'audience', title: S.screensTitle, head: S.colScreen, cols: visits, rows: this.itemRows(b.screens, page) });

      add({ id: 'events', section: 'actions', title: S.eventsTitle, sub: S.eventsSub, head: S.colAction, cols: [{ key: 'y', label: S.colTotal, delta: true }, { key: 'share', label: T.common.share, kind: 'pct' }], rows: this.itemRows(b.events, page), limit: 16 });
    }
    for (const t of d.extras?.tables ?? []) {
      const total = Math.max(1, t.items.reduce((n, i) => n + i.value, 0));
      out.push({ id: `x-${t.id}`, section: t.section, title: t.title, sub: t.sub ?? undefined, head: t.head, cols: [{ key: 'y', label: t.column, delta: t.items.some((i) => i.previous !== null) }, { key: 'share', label: T.common.share, kind: 'pct' }], rows: t.items.map((i) => ({ label: i.label ?? i.key, values: { y: i.value, share: i.value / total }, prev: i.previous === null ? undefined : { y: i.previous } })) });
    }
    return out;
  });

  protected readonly sections = computed(() => {
    const S = this.T().stats;
    const list: { id: Section; title: string; sub: string }[] = [
      { id: 'pages', title: S.sectionPages, sub: S.sectionPagesSub }, { id: 'sources', title: S.sectionSources, sub: S.sectionSourcesSub },
      { id: 'audience', title: S.sectionAudience, sub: S.sectionAudienceSub }, { id: 'actions', title: S.sectionActions, sub: S.sectionActionsSub },
    ];
    return list.map((s) => ({ ...s, blocks: this.blocks().filter((b) => b.section === s.id) }));
  });

  protected readonly sessionRows = computed(() => {
    const T = this.T(), tz = this.data()?.range.timeZone ?? 'UTC';
    return (this.data()?.sessions ?? []).map((s) => ({
      place: [s.city, s.country && countryName(T, s.country)].filter(Boolean).join(', ') || '—',
      tech: [s.device && deviceName(T, s.device), s.browser && browserName(s.browser), s.os].filter(Boolean).join(' · ') || '—',
      views: this.fmt(s.views),
      when: s.lastAt ? new Date(s.lastAt).toLocaleString(T.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz }) : '—',
    }));
  });

  /* ---------------------------------------------------------------- actions */
  private query(): Record<string, string | number> {
    return this.custom() && this.from() ? { from: this.from(), to: this.to() || this.today } : { days: this.days() };
  }

  protected choose(days: number): void {
    this.custom.set(false);
    this.days.set(days);
    void this.run();
  }
  protected openCustom(): void {
    if (!this.from()) this.from.set(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
    this.custom.set(true);
  }

  /** Charge la période (écran de chargement). */
  async run(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    await this.fetch(false);
    this.loading.set(false);
  }

  /** Recharge ; en silence, un échec garde l'affichage et le signale. */
  private async fetch(silent: boolean): Promise<void> {
    try {
      const d = await this.api.get<StatsOverview>(this.base(), '/overview', this.query());
      this.data.set(d);
      this.active.set(d.active);
      this.stale.set(d.active === null && d.status === 'ok');
      this.now.set(Date.now());
    } catch {
      if (silent) this.stale.set(true);
      else (this.data.set(null), this.failed.set(true));
    }
  }

  private async refreshLive(): Promise<void> {
    try {
      const r = await this.api.get<LiveResponse>(this.base(), '/live');
      this.active.set(r.active);
      this.stale.set(r.active === null);
    } catch {
      this.stale.set(true);
    }
  }

  protected jump(e: Event, id: string): void {
    const el = this.doc.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  protected print(): void {
    this.doc.defaultView?.print();
  }

  /** Ouvre le rapport tel qu'il partirait, dans un nouvel onglet, sans rien envoyer. */
  async previewReport(): Promise<void> {
    const win = this.doc.defaultView;
    const tab = win?.open('', '_blank') ?? null; // ouvert pendant le geste de l'utilisateur, sinon le navigateur bloque la fenêtre
    this.reporting.set(true);
    this.message.set(null);
    try {
      const r = await this.api.get<ReportPreview>(this.base(), '/report/preview', this.custom() ? this.query() : { days: Math.min(this.days(), 366) });
      const url = URL.createObjectURL(new Blob([r.html], { type: 'text/html;charset=utf-8' }));
      if (tab) tab.location.href = url;
      else win?.open(url, '_blank');
    } catch {
      tab?.close();
      this.message.set({ ok: false, text: this.T().stats.reportPreviewError });
    } finally {
      this.reporting.set(false);
    }
  }

  /** Envoie le rapport de la période aux destinataires prévus par le site (après confirmation). */
  async sendReport(): Promise<void> {
    const days = this.data()?.range.days ?? this.days();
    if (!(this.doc.defaultView?.confirm(fill(this.T().stats.sendReportConfirm, { days })) ?? false)) return;
    this.reporting.set(true);
    this.message.set({ ok: true, text: this.T().stats.reportSending });
    try {
      const r = await this.api.post<ReportSendResult>(this.base(), '/report/send', this.query());
      this.message.set(r.ok ? { ok: true, text: plural(this.T(), r.recipients, this.T().stats.reportSentOne, this.T().stats.reportSentOther) } : { ok: false, text: this.T().stats.reportError });
    } catch {
      this.message.set({ ok: false, text: this.T().stats.reportError });
    } finally {
      this.reporting.set(false);
    }
  }

  /** Lignes de l'export CSV global : totaux, séries, puis tous les tableaux. */
  csvRows(): (string | number | null)[][] {
    const d = this.data()!;
    const S = this.T().stats;
    const rows: (string | number | null)[][] = [[S.csvSection, S.csvLabel, S.csvColumn, S.csvValue], [this.T().periods.label, this.T().periods.from, '', d.range.from], [this.T().periods.label, this.T().periods.to, '', d.range.to]];
    for (const [k, v] of Object.entries(d.totals)) rows.push([S.csvTotals, k, '', v]);
    if (d.previous) for (const [k, v] of Object.entries(d.previous)) rows.push([S.csvPreviousTotals, k, '', v]);
    d.series.slots.forEach((s, i) => rows.push([S.pageviews, s, '', d.series.pageviews[i]], [S.visitors, s, '', d.series.visitors[i]]));
    for (const t of this.tiles().filter((x) => x.id?.startsWith('x-') || x.id?.startsWith('goal-'))) rows.push([t.group ?? '', t.label, '', t.value]);
    const all = [...this.blocks(), { title: S.countriesTitle, cols: this.visitsDelta(), rows: this.countryRows() }];
    for (const b of all) for (const r of b.rows) for (const c of b.cols) rows.push([b.title, r.label, c.label, r.values[c.key] ?? null]);
    return rows;
  }

  exportCsv(): void {
    const d = this.data();
    if (!d) return;
    download(this.doc, `${this.T().stats.csvName}-${d.range.days}j-${this.today}.csv`, toCsv(this.csvRows()));
  }
}
