/*
 * "Where visits come from" world map in SVG, without a mapping library: countries coloured by their visits, dots on small
 * countries, zoom buttons and panning with the mouse or a finger, tooltip. Same projection as the PNG map of the report. The base
 * map (GeoJSON) is served by the library server (`{apiUrl}/world.json`, apiUrl of the page that shows the map).
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CENTROIDS, countryName, featurePath, fill, formatNumber, intensity, mixHex, project, MAP_RATIO, type Item, type Texts, type World } from 'stats-kit/contract';
import { StatsKitApi, injectOptions, resolveTexts, worldAddress } from './config';

/** List in the locale ("France, Spain and Italy"), with a plain fallback where Intl.ListFormat is missing. */
const list = (locale: string, items: string[]): string => (typeof Intl.ListFormat === 'function' ? new Intl.ListFormat(locale, { type: 'unit' }).format(items) : items.join(', '));
import { PHONE, TOKENS } from './theme';

const WIDTH = 1000;
const HEIGHT = Math.round(WIDTH * MAP_RATIO);

interface Shape { iso: string; d: string; n: number }

@Component({
  selector: 'sk-world-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[attr.aria-label]': 'T().stats.mapAria' },
  template: `
    <div class="sk-map__frame" (pointerleave)="hover.set(null)">
      <svg class="sk-map__svg" [attr.viewBox]="viewBox()" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="summary()" focusable="false"
        (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up($event)" (pointercancel)="up($event)">
        <rect class="sk-map__sea" x="-2000" y="-2000" width="5000" height="5000" />
        @for (s of shapes(); track s.iso + $index) {
          <path class="sk-map__land" [attr.d]="s.d" [style.fill]="s.n ? color(s.n) : null" [class.sk-map__on]="s.n > 0" (pointerenter)="s.n && hover.set({ iso: s.iso, n: s.n })" />
        }
        @for (b of bubbles(); track b.iso) {
          <circle class="sk-map__dot" [attr.cx]="b.x" [attr.cy]="b.y" [attr.r]="b.r / zoom()" [style.stroke-width]="1.5 / zoom()" (pointerenter)="hover.set({ iso: b.iso, n: b.n })" />
        }
      </svg>
      @if (hover(); as h) { <div class="sk-map__tip" role="status">{{ country(h.iso, h.n) }}</div> }
      <div class="sk-map__zoom sk-noprint">
        <button type="button" (click)="zoomBy(1.6)" [attr.aria-label]="T().common.zoomIn" [title]="T().common.zoomIn">+</button>
        <button type="button" (click)="zoomBy(1 / 1.6)" [attr.aria-label]="T().common.zoomOut" [title]="T().common.zoomOut">−</button>
        <button type="button" (click)="reset()" [attr.aria-label]="T().common.zoomReset" [title]="T().common.zoomReset">⟲</button>
      </div>
    </div>
  `,
  styles: [TOKENS, `
    :host { display: block; min-width: 0; }
    .sk-map__frame { position: relative; overflow: hidden; border-radius: calc(var(--k-radius) - 4px); background: var(--k-map-sea); aspect-ratio: 1000 / 394; touch-action: none; }
    svg.sk-map__svg { display: block !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; cursor: grab; user-select: none; }
    svg.sk-map__svg:active { cursor: grabbing; }
    .sk-map__sea { fill: var(--k-map-sea); }
    .sk-map__land { fill: var(--k-map-land); stroke: var(--k-map-border); stroke-width: .5; vector-effect: non-scaling-stroke; }
    .sk-map__on:hover { stroke: var(--k-ink); stroke-width: 1.2; }
    .sk-map__dot { fill: var(--k-map-hi); stroke: var(--k-card); }
    .sk-map__tip { position: absolute; left: .5rem; top: .5rem; max-width: calc(100% - 1rem); overflow-wrap: anywhere; padding: .25rem .55rem; font-size: .8rem; font-weight: 600; color: var(--k-ink); background: var(--k-card); border: 1px solid var(--k-line); border-radius: 6px; box-shadow: var(--k-shadow); pointer-events: none; }
    .sk-map__zoom { position: absolute; right: .5rem; bottom: .5rem; display: grid; gap: 4px; }
    .sk-map__zoom button { width: 32px; height: 32px; font: inherit; font-size: 1rem; font-weight: 700; line-height: 1; color: var(--k-ink); background: var(--k-card); border: 1px solid var(--k-line2); border-radius: 6px; cursor: pointer; }
    .sk-map__zoom button:hover { color: var(--k-brand); border-color: var(--k-brand); }
    .sk-map__zoom button:focus-visible { outline: 2px solid var(--k-brand); outline-offset: 2px; }
    @media (max-width: ${PHONE}px) { .sk-map__zoom { grid-auto-flow: column; } .sk-map__zoom button { width: 48px; height: 48px; } }
    @media print { .sk-map__land, .sk-map__dot { print-color-adjust: exact; } }
  `],
})
export class SkWorldMap {
  private readonly api = inject(StatsKitApi);
  private readonly options = injectOptions();
  readonly texts = input<Texts | null>(null);
  private readonly fallback = resolveTexts(this.options);
  protected readonly T = computed(() => this.texts() ?? this.fallback);

  /** Visits by country (key = ISO alpha-2 code). */
  readonly countries = input.required<Item[]>();
  /** Address of the base map (default: the `worldUrl` option, then `{apiUrl}/world.json`). */
  readonly worldUrl = input<string | null>(null);
  /** API address of the source shown (default: the one of `provideStatsKit`); the base map is read under it. */
  readonly apiUrl = input<string | null>(null);
  /** Displayed name of a country (default: localised name). */
  readonly label = input<(code: string) => string>((code) => countryName(this.T(), code));
  /** Colours of the visited countries: few → many (default: --sk-map-lo / --sk-map-hi variables read on the page). */
  readonly low = input<string | null>(null);
  readonly high = input<string | null>(null);

  private readonly world = signal<World | null>(null);
  protected readonly hover = signal<{ iso: string; n: number } | null>(null);
  protected readonly zoom = signal(1);
  private readonly center = signal<[number, number]>([WIDTH / 2, HEIGHT / 2]);
  private drag: { x: number; y: number; c: [number, number]; w: number } | null = null;

  constructor() {
    effect(() => {
      const url = worldAddress(this.options, this.apiUrl(), this.worldUrl());
      this.api.world(url).then((w) => this.world.set(w as World), () => this.world.set({ features: [] }));
    });
  }

  private readonly counts = computed(() => {
    const m = new Map<string, number>();
    for (const c of this.countries()) m.set(c.key.toUpperCase(), (m.get(c.key.toUpperCase()) ?? 0) + c.value);
    return m;
  });
  private readonly max = computed(() => Math.max(1, ...this.counts().values()));
  private readonly paths = computed(() => (this.world()?.features ?? []).map((f) => ({ iso: f.properties.iso2, d: featurePath(f, WIDTH) })));
  protected readonly shapes = computed<Shape[]>(() => this.paths().map((p) => ({ ...p, n: this.counts().get(p.iso) ?? 0 })));
  protected readonly bubbles = computed(() =>
    [...this.counts()].flatMap(([iso, n]) => {
      const c = CENTROIDS[iso];
      if (!c || !n) return [];
      const [x, y] = project(c[1], c[0], WIDTH);
      return [{ iso, n, x, y, r: 2.5 + 5 * (n / this.max()) }];
    }),
  );
  protected readonly viewBox = computed(() => {
    const z = this.zoom(), [cx, cy] = this.center();
    const w = WIDTH / z, h = HEIGHT / z;
    return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  });
  protected readonly summary = computed(() => {
    const top = [...this.counts()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return fill(this.T().stats.mapSummary, { title: this.T().stats.mapTitle, list: list(this.T().locale, top.map(([iso, n]) => this.country(iso, n))) });
  });

  protected format(n: number): string {
    return fill(this.T().stats.mapLegend, { n: formatNumber(this.T(), n) });
  }
  /** Country and its visits, as the language writes it. */
  protected country(iso: string, n: number): string {
    return fill(this.T().stats.mapCountry, { country: this.label()(iso), n: this.format(n) });
  }
  /** Colour of a country: mix of the two shades (explicit values, otherwise CSS variables mixed with `color-mix`). */
  protected color(n: number): string {
    const t = intensity(n, this.max());
    const lo = this.low(), hi = this.high();
    if (lo && hi) return mixHex(lo, hi, t);
    return `color-mix(in srgb, var(--k-map-hi) ${Math.round(t * 100)}%, var(--k-map-lo))`;
  }

  private clamp([x, y]: [number, number], z: number): [number, number] {
    const w = WIDTH / z / 2, h = HEIGHT / z / 2;
    return [Math.min(WIDTH - w, Math.max(w, x)), Math.min(HEIGHT - h, Math.max(h, y))];
  }
  zoomBy(f: number): void {
    const z = Math.min(8, Math.max(1, this.zoom() * f));
    this.zoom.set(z);
    this.center.set(this.clamp(this.center(), z));
  }
  reset(): void {
    this.zoom.set(1);
    this.center.set([WIDTH / 2, HEIGHT / 2]);
  }
  protected down(e: PointerEvent): void {
    if (this.zoom() === 1) return;
    const el = e.currentTarget as Element;
    this.drag = { x: e.clientX, y: e.clientY, c: this.center(), w: el.getBoundingClientRect().width || WIDTH };
    el.setPointerCapture?.(e.pointerId);
  }
  protected move(e: PointerEvent): void {
    if (!this.drag) return;
    const k = WIDTH / this.zoom() / this.drag.w;
    this.center.set(this.clamp([this.drag.c[0] - (e.clientX - this.drag.x) * k, this.drag.c[1] - (e.clientY - this.drag.y) * k], this.zoom()));
  }
  protected up(e: PointerEvent): void {
    this.drag = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }
}
