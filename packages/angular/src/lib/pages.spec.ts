import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, PLATFORM_ID, provideZonelessChangeDetection, type Provider, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { IndexationResponse, SearchOverview, StatsOverview, YoutubeOverview } from 'stats-kit/contract';
import overviewJson from '../../../contract/examples/overview.json';
import overview24Json from '../../../contract/examples/overview-24h.json';
import overviewOffJson from '../../../contract/examples/overview-not-configured.json';
import searchJson from '../../../contract/examples/search.json';
import searchOffJson from '../../../contract/examples/search-not-configured.json';
import indexationJson from '../../../contract/examples/indexation.json';
import youtubeJson from '../../../contract/examples/youtube.json';
import youtubeOffJson from '../../../contract/examples/youtube-not-configured.json';
import { latin, pseudoTexts, scrub } from '../../../contract/test/pseudo';
import { provideStatsKit, type StatsKitOptions } from './config';
import { SkSearchConsole } from './search-console';
import { SkStatistics, SkStatistiques } from './statistics';
import { SkYoutube } from './youtube';

const overview = overviewJson as unknown as StatsOverview;
const search = searchJson as unknown as SearchOverview;
const youtube = youtubeJson as unknown as YoutubeOverview;
const API = '/api/admin/audience';
const tick = async (f: ComponentFixture<unknown>) => {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r));
    await f.whenStable();
  }
};

function mount<T>(type: Type<T>, inputs: Record<string, unknown> = {}, platform = 'browser', options: Partial<StatsKitOptions> = {}, extra: Provider[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideStatsKit({ apiUrl: API, ...options }), { provide: PLATFORM_ID, useValue: platform }, ...extra] });
  const f = TestBed.createComponent(type);
  for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
  return { f, http: TestBed.inject(HttpTestingController), el: f.nativeElement as HTMLElement };
}
const text = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const button = (el: HTMLElement, label: string) => [...el.querySelectorAll('button, a')].find((b) => text(b) === label) as HTMLButtonElement;
const worlds = (http: HttpTestingController) => http.match((r) => r.url.endsWith('world.json')).forEach((r) => r.flush({ features: [] }));
const stubDownload = () => {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
};

describe('Statistics page', () => {
  afterEach(() => vi.useRealTimers());

  it('loads the period, shows every section', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    expect(text(el)).toContain('Loading statistics');
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    worlds(http);
    const t = text(el);
    for (const s of ['Statistics', 'Audience', 'Engagement', 'Goals', 'Site data', 'Requests received', 'Page views and visitors per day', 'What visitors do', 'Where visits come from', 'Last 24 hours', 'When do they come?', 'Most viewed pages', 'Product pages', 'Acquisition channels', 'Traffic sources', 'Regions', 'Browsers', 'Visitor actions', 'Requests by subject', 'Latest sessions', 'Open Umami']) expect(t).toContain(s);
    expect(el.getAttribute('data-sk-mode')).toMatch(/light|dark/);
    expect(el.querySelectorAll('sk-metric-table').length).toBeGreaterThan(15);
    expect(el.querySelectorAll('.sk-funnel li')).toHaveLength(4);
    expect(el.querySelectorAll('.sk-sessions tbody tr')).toHaveLength(12);
    expect(t).toMatch(/\d active visitors/);
    expect(t).toContain('Best day:');
    expect(t).toContain('Busiest slot:');
    expect(t).toContain('Updated');
  });

  it('changes period, dates, language; pauses the refresh', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0, presets: [1, 7] });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    button(el, '24 h').click();
    http.expectOne(`${API}/overview?days=1`).flush(overview24Json);
    await tick(f);
    expect(text(el)).toContain('Page views and visitors per hour');
    expect(text(el)).toContain('last 24 hours');
    button(el, 'Custom').click();
    await tick(f);
    const [from, to] = [...el.querySelectorAll('input[type=date]')] as HTMLInputElement[];
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('change'));
    to.value = '2026-11-07';
    to.dispatchEvent(new Event('change'));
    await tick(f);
    button(el, 'Show').click();
    http.expectOne(`${API}/overview?from=2026-11-01&to=2026-11-07`).flush(overview);
    await tick(f);
    button(el, '7 days').click();
    http.expectOne(`${API}/overview?days=7`).flush(overview);
    await tick(f);
    const pause = el.querySelector('.sk-pause') as HTMLButtonElement;
    pause.click();
    await tick(f);
    expect(pause.getAttribute('aria-pressed')).toBe('true');
    f.componentRef.setInput('locale', 'fr');
    f.componentRef.setInput('texts', { stats: { title: 'Audience' } });
    f.componentRef.setInput('theme', 'dark');
    await tick(f);
    expect(text(el)).toContain('Audience');
    expect(text(el)).toContain('D’où viennent les visites');
    expect(el.getAttribute('data-sk-mode')).toBe('dark');
    worlds(http);
  });

  it('live count and automatic refresh, silent, failures reported', async () => {
    vi.useFakeTimers();
    const { f, http, el } = mount(SkStatistics, { liveMs: 1000, refreshMs: 5000 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(1000);
    http.expectOne(`${API}/live`).flush({ version: 1, active: 9, at: '' });
    await vi.advanceTimersByTimeAsync(10);
    f.detectChanges();
    expect(text(el)).toContain('9 active visitors');
    await vi.advanceTimersByTimeAsync(1000);
    http.expectOne(`${API}/live`).flush('', { status: 500, statusText: 'x' });
    await vi.advanceTimersByTimeAsync(10);
    f.detectChanges();
    expect(text(el)).toContain('Live count unavailable');
    await vi.advanceTimersByTimeAsync(1000);
    http.expectOne(`${API}/live`).flush({ version: 1, active: null, at: '' });
    await vi.advanceTimersByTimeAsync(2000);
    http.match(`${API}/live`).forEach((r) => r.flush({ version: 1, active: 1, at: '' }));
    http.expectOne(`${API}/overview?days=30`).flush('', { status: 500, statusText: 'x' });
    await vi.advanceTimersByTimeAsync(10);
    f.detectChanges();
    expect(text(el)).toContain('Page views and visitors per day'); // display kept
    document.dispatchEvent(new Event('visibilitychange'));
    http.match(`${API}/live`).forEach((r) => r.flush({ version: 1, active: 1, at: '' }));
    worlds(http);
    f.destroy();
  });

  it('not configured, Umami down, server unreachable then new attempt', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overviewOffJson);
    await tick(f);
    expect(text(el)).toContain('Visit statistics are not connected');
    expect(el.querySelector('.sk-funnel')).toBeNull();
    button(el, '90 days').click();
    http.expectOne(`${API}/overview?days=90`).flush({ ...overview, status: 'error', error: 'outage' });
    await tick(f);
    expect(text(el)).toContain('temporarily unavailable');
    button(el, 'Try again').click();
    http.expectOne(`${API}/overview?days=90`).flush('', { status: 502, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Statistics could not be loaded');
    button(el, 'Try again').click();
    http.expectOne(`${API}/overview?days=90`).flush({ ...overview, active: null, previous: null, goals: [], extras: null, pages: [], sessions: [], dashboardUrl: null, totals: { ...overview.totals, visits: 0, visitors: 10 }, series: { ...overview.series, pageviews: overview.series.pageviews.map(() => 0), previousPageviews: null }, heatmap: overview.heatmap.map((r) => r.map(() => 0)) });
    await tick(f);
    const t = text(el);
    expect(t).toContain('Live count unavailable');
    expect(t).toContain('Not enough visits yet');
    expect(t).toContain('No session over the period');
    expect(t).toContain('Few visitors');
    worlds(http);
  });

  it('extras alone, no detailed page table, funnel without goals', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0, report: false });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush({ ...overview, goals: [], pages: [], extras: { tiles: [{ id: 't', label: 'Text', value: 'ok', previous: null, sub: null, group: 'Home-made', highlight: false }], tables: [{ id: 'x', title: 'Home-made table', sub: 'below', head: 'H', column: 'C', section: 'pages', items: [{ key: 'k', label: null, value: 1, previous: null }] }], funnel: { label: 'End', value: 0 } } });
    await tick(f);
    const t = text(el);
    expect(t).toContain('Home-made table');
    expect(t).toContain('Home-made');
    expect(t).not.toContain('Preview report');
    expect(el.querySelectorAll('.sk-funnel li')).toHaveLength(3);
    worlds(http);
  });

  it('funnel: last step without engaged visit', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush({ ...overview, goals: [], totals: { ...overview.totals, visits: 0, bounces: 0 }, extras: { tiles: [], tables: [], funnel: { label: 'End', value: 2 } } });
    await tick(f);
    expect(text(el)).toContain('End');
    worlds(http);
  });

  it('CSV export, printing, report preview and sending', async () => {
    const click = stubDownload();
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    const rows = f.componentInstance.csvRows();
    expect(rows[0]).toEqual(['Section', 'Label', 'Column', 'Value']);
    expect(rows.length).toBeGreaterThan(300);
    expect(rows.some((r) => r[0] === 'Countries' && r[1] === 'France')).toBe(true);
    button(el, 'Export (CSV)').click();
    expect(click).toHaveBeenCalled();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    button(el, 'Print').click();
    expect(print).toHaveBeenCalled();
    const tab = { location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    button(el, 'Preview report').click();
    http.expectOne(`${API}/report/preview?days=30`).flush({ version: 1, subject: 's', html: '<p>x</p>', text: 'x' });
    await tick(f);
    expect(tab.location.href).toBe('blob:x');
    button(el, 'Preview report').click();
    http.expectOne(`${API}/report/preview?days=30`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(tab.close).toHaveBeenCalled();
    expect(text(el)).toContain('The report could not be generated.');
    open.mockReturnValue(null);
    button(el, 'Preview report').click();
    http.expectOne(`${API}/report/preview?days=30`).flush({ version: 1, subject: 's', html: 'x', text: 'x' });
    await tick(f);
    expect(open).toHaveBeenLastCalledWith('blob:x', '_blank');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    button(el, 'Send report').click();
    http.expectNone(`${API}/report/send?days=30`);
    button(el, 'Send report').click();
    http.expectOne((r) => r.method === 'POST' && r.urlWithParams === `${API}/report/send?days=30`).flush({ version: 1, ok: true, recipients: 2, error: null });
    await tick(f);
    expect(text(el)).toContain('Report sent to 2 recipients.');
    button(el, 'Send report').click();
    http.expectOne(`${API}/report/send?days=30`).flush({ version: 1, ok: false, recipients: 0, error: 'x' });
    await tick(f);
    expect(text(el)).toContain('The report could not be sent.');
    button(el, 'Send report').click();
    http.expectOne(`${API}/report/send?days=30`).flush('', { status: 503, statusText: 'x' });
    await tick(f);
    expect(confirm).toHaveBeenCalledTimes(4);
    button(el, 'Custom').click();
    await tick(f);
    button(el, 'Preview report').click();
    http.expectOne((r) => r.url === `${API}/report/preview` && r.params.has('from')).flush({ version: 1, subject: 's', html: 'x', text: 'x' });
    worlds(http);
  });

  it('jump to a section', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0 });
    document.body.appendChild(el);
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    document.querySelectorAll('#sk-sources').forEach((n) => n !== el.querySelector('#sk-sources') && n.removeAttribute('id'));
    const target = el.querySelector('#sk-sources') as HTMLElement;
    target.scrollIntoView = vi.fn();
    const jump = (id: string) => (f.componentInstance as unknown as { jump(e: Event, id: string): void }).jump(new Event('click', { cancelable: true }), id);
    vi.spyOn(document, 'getElementById').mockReturnValueOnce(target);
    jump('sk-sources');
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(target);
    jump('absent');
    worlds(http);
    el.remove();
  });

  it('server rendering: nothing is loaded', () => {
    const { f, http } = mount(SkStatistics, {}, 'server');
    f.detectChanges();
    http.expectNone(`${API}/overview?days=30`);
  });
});

describe('Google page', () => {
  it('every section, brand scope, indexing, export', async () => {
    const click = stubDownload();
    const { f, http, el } = mount(SkSearchConsole, { apiUrl: '/api/g' });
    f.detectChanges();
    http.expectOne('/api/g/search?days=28').flush(search);
    await tick(f);
    const t = text(el);
    for (const s of ['Clicks from Google', 'Impressions in Google per day', 'Queries', 'Queries × pages', 'High-potential queries', 'Rising queries', 'Falling queries', 'New queries', 'Pages often shown but rarely clicked', 'Pages that lost their clicks', 'Queries with several pages', 'Countries', 'Devices', 'Search appearance', 'Sitemaps', 'Brand clicks', 'Clicks, last 7 days']) expect(t).toContain(s);
    const firstRows = () => text(el.querySelector('#sk-queries sk-metric-table tbody') as Element);
    button(el, 'Brand').click();
    await tick(f);
    expect(firstRows()).toContain('example');
    expect(firstRows()).not.toContain('solid oak table');
    button(el, 'Non-brand').click();
    await tick(f);
    expect(firstRows()).not.toContain('example workshop');
    button(el, 'All').click();
    button(el, 'Check indexing').click();
    await tick(f);
    http.expectOne('/api/g/search/indexation').flush(indexationJson);
    await tick(f);
    expect(text(el)).toContain('Page indexing');
    expect(text(el)).toContain('Indexed pages');
    expect(f.componentInstance.csvRows().length).toBeGreaterThan(40);
    button(el, 'Export (CSV)').click();
    expect(click).toHaveBeenCalled();
    vi.spyOn(window, 'print').mockImplementation(() => {});
    button(el, 'Print').click();
    button(el, '7 days').click();
    http.expectOne('/api/g/search?days=7').flush({ ...search, brandTerms: [], sitemaps: null, series: search.series.slice(0, 5), totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 } });
    await tick(f);
    expect(text(el)).not.toContain('Brand clicks');
    expect(text(el)).toContain('No sitemap submitted to Google.');
  });
  it('indexing failure, not configured, error with service account, unreachable', async () => {
    const { f, http, el } = mount(SkSearchConsole, { initialDays: 90 });
    f.detectChanges();
    http.expectOne(`${API}/search?days=90`).flush(search);
    await tick(f);
    button(el, 'Check indexing').click();
    http.expectOne(`${API}/search/indexation`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Indexing could not be checked.');
    f.componentInstance.indexation.set({ ...(indexationJson as unknown as IndexationResponse), total: 0, indexed: 0, pages: [] });
    await tick(f);
    expect(text(el)).toContain('0 of 0 pages indexed');
    button(el, '28 days').click();
    http.expectOne(`${API}/search?days=28`).flush(searchOffJson);
    await tick(f);
    expect(text(el)).toContain('Search Console is not connected');
    button(el, '365 days').click();
    http.expectOne(`${API}/search?days=365`).flush({ ...search, status: 'error', error: 'gsc 403' });
    await tick(f);
    expect(text(el)).toContain('Add this account as a');
    button(el, 'Try again').click();
    http.expectOne(`${API}/search?days=365`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Statistics could not be loaded');
    button(el, 'Try again').click();
    http.expectOne(`${API}/search?days=365`).flush({ ...search, status: 'error', error: 'x', serviceAccount: null });
    await tick(f);
    expect(text(el)).not.toContain('Add this account');
  });
  it('server rendering: nothing is loaded', () => {
    const { f, http } = mount(SkSearchConsole, {}, 'server');
    f.detectChanges();
    http.expectNone(`${API}/search?days=28`);
  });
});

describe('YouTube page', () => {
  it('channel, site side, trend, traffic sources, videos, export', async () => {
    const click = stubDownload();
    const { f, http, el } = mount(SkYoutube);
    f.detectChanges();
    http.expectOne(`${API}/youtube?days=28`).flush(youtube);
    await tick(f);
    const t = text(el);
    for (const s of ['Example Workshop', '@example-workshop', 'Open YouTube Studio', 'Subscribers', 'Total views', 'Minutes watched', 'Visits from YouTube', 'Landing pages', 'Requests after a visit from YouTube', 'Views per day', 'Where views come from', 'YouTube search', 'An oak table', 'Unlisted']) expect(t).toContain(s);
    expect(f.componentInstance.csvRows()[0][0]).toBe('Video');
    button(el, 'Export (CSV)').click();
    expect(click).toHaveBeenCalled();
    button(el, '7 days').click();
    http.expectOne(`${API}/youtube?days=7`).flush({ ...youtube, days: 7, analyticsError: 'quota', channel: { ...youtube.channel!, subscribers: null, thumbnail: 'https://example.test/a.png' }, previous: { ...youtube.previous, views: 0 }, site: { ...youtube.site!, visits: null, requests: null }, videos: [{ ...youtube.videos[0], label: 'Film', visibility: 'private', averageViewPercentage: null, publishedAt: null }] });
    await tick(f);
    const u = text(el);
    expect(u).toContain('hidden');
    expect(u).toContain('YouTube Analytics refused the request');
    expect(u).toContain('Film');
    expect(u).toContain('Private');
    expect(el.querySelector('.sk-channel img')).not.toBeNull();
  });
  it('not configured, error, unreachable, without site side', async () => {
    const { f, http, el } = mount(SkYoutube);
    f.detectChanges();
    http.expectOne(`${API}/youtube?days=28`).flush({ ...youtubeOffJson, channelUrl: 'https://www.youtube.com/@demo' });
    await tick(f);
    expect(text(el)).toContain('YouTube channel is not connected');
    expect(button(el, 'Open channel')).toBeTruthy();
    button(el, '90 days').click();
    http.expectOne(`${API}/youtube?days=90`).flush({ ...youtubeOffJson, status: 'error', error: 'revoked token' });
    await tick(f);
    expect(text(el)).toContain('revoked token');
    button(el, 'Try again').click();
    http.expectOne(`${API}/youtube?days=90`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Statistics could not be loaded');
    button(el, 'Try again').click();
    http.expectOne(`${API}/youtube?days=90`).flush({ ...youtube, site: null, videos: [] });
    await tick(f);
    expect(text(el)).toContain('No video published on the channel.');
    expect(f.componentInstance.siteTiles()).toEqual([]);
    f.componentInstance.data.set({ ...youtube, channel: null });
    expect(f.componentInstance.tiles()).toEqual([]);
    f.componentInstance.data.set({ ...youtube, site: { ...youtube.site!, requestsBySubject: [{ key: '', label: null, value: 1, previous: null }] } });
    await tick(f);
    expect(text(el)).toContain('Not specified');
  });
  it('server rendering: nothing is loaded', () => {
    const { f, http } = mount(SkYoutube, {}, 'server');
    f.detectChanges();
    http.expectNone(`${API}/youtube?days=28`);
  });
});

describe('languages', () => {
  /** Visible text and the texts read by assistive technologies or shown on hover. */
  const everything = (el: HTMLElement) =>
    [el.textContent ?? '', ...[...el.querySelectorAll('*')].flatMap((n) => ['aria-label', 'title', 'placeholder', 'alt', 'data-label'].map((a) => n.getAttribute(a) ?? ''))].join(' ');

  it('no hard-coded text in the three pages: with a pseudo-locale, nothing Latin is shown', async () => {
    const options = { baseTexts: pseudoTexts() };
    const stats = mount(SkStatistics, { liveMs: 0, refreshMs: 0 }, 'browser', options);
    stats.f.detectChanges();
    expect(latin(everything(stats.el))).toEqual([]); // loading screen
    stats.http.expectOne(`${API}/overview?days=30`).flush(scrub(overview));
    await tick(stats.f);
    worlds(stats.http);
    await tick(stats.f);
    expect(latin(everything(stats.el))).toEqual([]);
    expect(stats.el.querySelectorAll('sk-metric-table').length).toBeGreaterThan(15);

    const google = mount(SkSearchConsole, {}, 'browser', options);
    google.f.detectChanges();
    google.http.expectOne(`${API}/search?days=28`).flush(scrub(search));
    await tick(google.f);
    (google.el.querySelector('.sk-card .sk-btn') as HTMLButtonElement).click();
    google.http.expectOne(`${API}/search/indexation`).flush(scrub(indexationJson));
    await tick(google.f);
    expect(latin(everything(google.el))).toEqual([]);

    const yt = mount(SkYoutube, {}, 'browser', options);
    yt.f.detectChanges();
    yt.http.expectOne(`${API}/youtube?days=28`).flush(scrub(youtube));
    await tick(yt.f);
    expect(latin(everything(yt.el))).toEqual([]);
  });

  it('follows the application LOCALE_ID when no locale is given', async () => {
    const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0 }, 'browser', {}, [{ provide: LOCALE_ID, useValue: 'de-CH' }]);
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    worlds(http);
    expect(text(el)).toContain('Statistiken');
    expect(text(el)).toMatch(/\d['’]\d{3}/); // Swiss grouping of thousands
  });

  it('each shipped language renders the page in that language', async () => {
    for (const [locale, title] of [['es', 'Estadísticas'], ['it', 'Statistiche'], ['pt', 'Estatísticas'], ['nl', 'Statistieken']]) {
      const { f, http, el } = mount(SkStatistics, { liveMs: 0, refreshMs: 0, locale });
      f.detectChanges();
      http.expectOne(`${API}/overview?days=30`).flush(overview);
      await tick(f);
      worlds(http);
      expect(el.querySelector('h1')?.textContent).toBe(title);
    }
  });

  it('the deprecated <sk-statistiques> tag still works for one release', async () => {
    @Component({ imports: [SkStatistiques], template: `<sk-statistiques [liveMs]="0" [refreshMs]="0" locale="fr" />` })
    class Host {}
    const { f, http, el } = mount(Host);
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    worlds(http);
    expect(el.querySelector('sk-statistiques h1')?.textContent).toBe('Statistiques');
  });
});
