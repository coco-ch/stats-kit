/*
 * Page « YouTube » : la chaîne (en-tête, liens), tuiles de la chaîne et de la période, ce que la chaîne apporte au site (visites
 * par lien suivi, pages d'arrivée, demandes), vues et minutes par jour avec la période précédente, provenance des vues, vidéos.
 */
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, PLATFORM_ID, computed, inject, input, signal, type OnInit } from '@angular/core';
import { delta, fill, formatDuration, formatNumber, gap, lastDays, shortDate, sparkPath, toCsv, type TextOverrides, type YoutubeOverview } from 'stats-kit/contrat';
import { SkMetricTable, SkTileGroups, SkTrendChart, type Col, type MRow, type TileData } from './blocs';
import { StatsKitApi, download, injectOptions, resolveTexts } from './config';
import { LAYOUT, TOKENS, resolvedMode, type ThemeChoice } from './theme';

@Component({
  selector: 'sk-youtube',
  imports: [SkTileGroups, SkMetricTable, SkTrendChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-sk-mode]': 'mode()' },
  styles: [TOKENS, LAYOUT, `
    .sk-channel { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1rem; }
    .sk-channel img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: var(--k-badge); }
    .sk-channel h2 { font-size: 1.15rem; }
    .sk-channel .sk-group { margin-left: auto; }
  `],
  template: `
    <div class="sk-page">
      <header class="sk-head">
        <h1>{{ T().youtube.title }}</h1>
        <p class="sk-lead">{{ T().youtube.lead }}</p>
        <div class="sk-toolbar">
          <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
            @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="days() === p" (click)="choose(p)">{{ fill(T().periods.days, { n: p }) }}</button> }
          </div>
          @if (data()?.channel) { <div class="sk-group"><button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button></div> }
        </div>
      </header>

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().youtube.notConfiguredTitle }}</b>{{ T().youtube.notConfiguredHelp }}</div>@if (d.channelUrl) { <a class="sk-btn" [href]="d.channelUrl" target="_blank" rel="noopener">{{ T().youtube.openChannel }}</a> }</div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().youtube.errorTitle }}</b>{{ d.error }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
        }
        @if (d.channel; as c) {
          <section class="sk-card sk-channel">
            @if (c.thumbnail) { <img [src]="c.thumbnail" alt="" /> }
            <div><h2>{{ c.title }}</h2>@if (c.handle) { <p class="sk-sub">{{ c.handle }}</p> }</div>
            <div class="sk-group">
              <a class="sk-btn" [href]="c.url" target="_blank" rel="noopener">{{ T().youtube.openChannel }}</a>
              <a class="sk-btn" [href]="c.studioUrl" target="_blank" rel="noopener">{{ T().youtube.openStudio }}</a>
            </div>
          </section>
          @if (d.analyticsError) { <p class="sk-status sk-status--warn" role="status">{{ fill(T().youtube.analyticsError, { error: d.analyticsError }) }}</p> }
          <sk-tile-groups [tiles]="tiles()" />
        }
        @if (d.site) {
          <section class="sk-section" id="sk-yt-site">
            <h2>{{ T().youtube.sectionSite }} <small>{{ T().youtube.sectionSiteSub }}</small></h2>
            <sk-tile-groups [tiles]="siteTiles()" />
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().youtube.landingTitle" [sub]="T().youtube.landingSub" [head]="T().youtube.colPage" [rows]="landingRows()" [cols]="viewCols()" [limit]="8" [empty]="T().youtube.landingEmpty" />
              @if (d.site.requests !== null) { <sk-metric-table [texts]="T()" [title]="T().youtube.subjectsTitle" [head]="T().youtube.colSubject" [rows]="subjectRows()" [cols]="requestCols()" [limit]="8" [empty]="T().youtube.subjectsEmpty" /> }
            </div>
          </section>
        }
        @if (d.channel) {
          <section class="sk-section" id="sk-yt-trend">
            <h2>{{ T().youtube.sectionTrend }} <small>{{ T().youtube.sectionTrendSub }}</small></h2>
            <div class="sk-twin">
              <sk-trend-chart [texts]="T()" [title]="T().youtube.viewsChart" [barLabel]="T().youtube.views" [slots]="period().current.map(dateOf)" [bar]="bars('views')" [prev]="prevBars('views')" />
              <sk-trend-chart [texts]="T()" [title]="T().youtube.minutesChart" [barLabel]="T().youtube.minutes" [slots]="period().current.map(dateOf)" [bar]="bars('minutes')" [prev]="prevBars('minutes')" />
            </div>
            <sk-metric-table [texts]="T()" [title]="T().youtube.trafficTitle" [sub]="T().youtube.trafficSub" [head]="T().youtube.colSource" [rows]="trafficRows()" [cols]="trafficCols()" />
          </section>
          <section class="sk-section" id="sk-yt-videos">
            <h2>{{ T().youtube.sectionVideos }} <small>{{ T().youtube.sectionVideosSub }}</small></h2>
            <sk-metric-table [texts]="T()" [title]="T().youtube.videos" [head]="T().youtube.colVideo" [rows]="videoRows()" [cols]="videoCols()" [limit]="20" [empty]="T().youtube.videosEmpty" />
          </section>
        }
      }
    </div>
  `,
})
export class SkYoutube implements OnInit {
  private readonly api = inject(StatsKitApi);
  private readonly doc = inject(DOCUMENT);
  private readonly options = injectOptions();
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly apiUrl = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly texts = input<TextOverrides | null>(null);
  readonly presets = input<number[]>([7, 28, 90]);
  readonly initialDays = input(28);
  readonly theme = input<ThemeChoice>('auto');

  protected readonly mode = resolvedMode(this.theme);
  protected readonly T = computed(() => resolveTexts(this.options, this.locale(), this.texts()));
  protected readonly fill = fill;
  private readonly base = computed(() => this.apiUrl() ?? this.options.apiUrl);
  protected readonly days = signal(28);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  readonly data = signal<YoutubeOverview | null>(null);

  ngOnInit(): void {
    if (!this.browser) return;
    this.days.set(this.initialDays());
    void this.load();
  }

  protected choose(days: number): void {
    this.days.set(days);
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      this.data.set(await this.api.get<YoutubeOverview>(this.base(), '/youtube', { days: this.days() }));
    } catch {
      this.data.set(null);
      this.failed.set(true);
    }
    this.loading.set(false);
  }

  private fmt(v: number, d = 0): string {
    return formatNumber(this.T(), v, d);
  }
  protected readonly dateOf = (d: { date: string }) => d.date;
  protected readonly period = computed(() => lastDays(this.data()?.series ?? [], this.data()?.days ?? this.days()));
  protected bars(k: 'views' | 'minutes'): number[] {
    return this.period().current.map((x) => x[k]);
  }
  protected prevBars(k: 'views' | 'minutes'): number[] {
    return this.period().before.map((x) => x[k]);
  }

  readonly tiles = computed<TileData[]>(() => {
    const d = this.data(), c = d?.channel;
    if (!d || !c) return [];
    const T = this.T(), Y = T.youtube;
    const t = d.totals, b = d.previous;
    const C = Y.groupChannel, P = Y.groupPeriod;
    const spark = (k: 'views' | 'minutes') => sparkPath(this.bars(k));
    return [
      { id: 'subs', group: C, label: Y.subscribers, value: c.subscribers === null ? T.common.hidden : this.fmt(c.subscribers), change: null, sub: Y.subscribersSub, spark: '' },
      { id: 'total', group: C, label: Y.totalViews, value: this.fmt(c.views), change: null, sub: Y.sinceCreation, spark: '' },
      { id: 'videos', group: C, label: Y.videos, value: this.fmt(d.videos.length), change: null, sub: Y.videosSub, spark: '' },
      { id: 'views', group: P, label: Y.views, value: this.fmt(t.views), change: delta(T, t.views, b.views), sub: fill(T.common.perDay, { n: this.fmt(t.views / Math.max(1, d.days), 1) }), spark: spark('views') },
      { id: 'minutes', group: P, label: Y.minutes, value: this.fmt(t.minutes), change: delta(T, t.minutes, b.minutes), sub: fill(Y.hoursSub, { n: this.fmt(t.minutes / 60, 1) }), spark: spark('minutes') },
      { id: 'avg', group: P, label: Y.avgView, value: formatDuration(t.averageViewDuration), change: b.views ? gap(T, t.averageViewDuration, b.averageViewDuration, false, 0, ' s') : null, sub: Y.perView, spark: '' },
      { id: 'gained', group: P, label: Y.gained, value: this.fmt(t.gained), change: delta(T, t.gained, b.gained), sub: fill(Y.gainedSub, { lost: this.fmt(t.lost), balance: `${t.gained - t.lost >= 0 ? '+' : ''}${this.fmt(t.gained - t.lost)}` }), spark: '' },
    ];
  });

  readonly siteTiles = computed<TileData[]>(() => {
    const s = this.data()?.site;
    if (!s) return [];
    const T = this.T(), Y = T.youtube, G = ''; // le titre de la section suffit
    const n = (v: number | null) => (v === null ? '—' : this.fmt(v));
    const out: TileData[] = [
      { id: 'visits', group: G, label: Y.siteVisits, value: n(s.visits), change: s.visits === null ? null : delta(T, s.visits, s.previousVisits), sub: Y.siteVisitsSub, spark: '' },
      { id: 'visitors', group: G, label: Y.siteVisitors, value: n(s.visitors), change: null, sub: Y.siteVisitorsSub, spark: '' },
      { id: 'referred', group: G, label: Y.referred, value: n(s.referred), change: null, sub: Y.referredSub, spark: '' },
    ];
    if (s.requests !== null) out.push({ id: 'requests', group: G, label: Y.requests, value: this.fmt(s.requests), change: delta(T, s.requests, s.previousRequests), sub: Y.requestsSub, spark: '' });
    return out;
  });

  protected readonly viewCols = computed<Col[]>(() => [{ key: 'v', label: this.T().youtube.colViews }]);
  protected readonly requestCols = computed<Col[]>(() => [{ key: 'v', label: this.T().youtube.colRequests }]);
  protected readonly trafficCols = computed<Col[]>(() => [{ key: 'views', label: this.T().youtube.colViews }, { key: 'minutes', label: this.T().youtube.colMinutes }]);
  protected readonly videoCols = computed<Col[]>(() => {
    const Y = this.T().youtube;
    return [{ key: 'views', label: Y.colViews }, { key: 'minutes', label: Y.colMinutes }, { key: 'pct', label: Y.colAvgPct, kind: 'pct' }, { key: 'duration', label: Y.colDuration, kind: 'dur' }, { key: 'likes', label: Y.colLikes }, { key: 'comments', label: Y.colComments }, { key: 'published', label: Y.colPublished, kind: 'text' }];
  });
  protected readonly landingRows = computed<MRow[]>(() => (this.data()?.site?.landing ?? []).map((i) => ({ label: i.label ?? i.key, values: { v: i.value } })));
  protected readonly subjectRows = computed<MRow[]>(() => (this.data()?.site?.requestsBySubject ?? []).map((i) => ({ label: i.label ?? (i.key || this.T().common.notSpecified), values: { v: i.value } })));
  protected readonly trafficRows = computed<MRow[]>(() => (this.data()?.traffic ?? []).map((t) => ({ label: this.T().youtubeTraffic[t.source] ?? t.source, values: { views: t.views, minutes: t.minutes } })));
  protected readonly videoRows = computed<MRow[]>(() => (this.data()?.videos ?? []).map((v) => ({
    label: v.label ?? v.title, sub: [v.label ? v.title : '', v.visibility !== 'public' ? (this.T().youtube.visibility[v.visibility] ?? v.visibility) : ''].filter(Boolean).join(' · ') || undefined, href: v.url,
    values: { views: v.views, minutes: v.minutes, pct: v.averageViewPercentage === null ? null : v.averageViewPercentage / 100, duration: v.duration, likes: v.likes, comments: v.comments, published: v.publishedAt ? shortDate(this.T(), v.publishedAt, 'UTC', true) : '—' },
  })));

  csvRows(): (string | number | null)[][] {
    const Y = this.T().youtube;
    const d = this.data()!;
    return [
      [Y.colVideo, Y.colViews, Y.colMinutes, Y.colAvgPct, Y.colDuration, Y.colLikes, Y.colComments, Y.colPublished],
      ...d.videos.map((v) => [v.title, v.views, v.minutes, v.averageViewPercentage, v.duration, v.likes, v.comments, v.publishedAt]),
      [],
      ['date', Y.views, Y.minutes, Y.gained, 'lost'],
      ...d.series.map((x) => [x.date, x.views, x.minutes, x.gained, x.lost]),
    ];
  }
  exportCsv(): void {
    download(this.doc, `${this.T().youtube.csvName}-${this.days()}j.csv`, toCsv(this.csvRows()));
  }
}
