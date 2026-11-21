import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { IndexationResponse, SearchOverview, StatsOverview, YoutubeOverview } from 'stats-kit/contrat';
import overviewJson from '../../../contrat/exemples/overview.json';
import overview24Json from '../../../contrat/exemples/overview-24h.json';
import overviewOffJson from '../../../contrat/exemples/overview-non-configure.json';
import searchJson from '../../../contrat/exemples/search.json';
import searchOffJson from '../../../contrat/exemples/search-non-configure.json';
import indexationJson from '../../../contrat/exemples/indexation.json';
import youtubeJson from '../../../contrat/exemples/youtube.json';
import youtubeOffJson from '../../../contrat/exemples/youtube-non-configure.json';
import { provideStatsKit } from './config';
import { SkSearchConsole } from './search-console';
import { SkStatistiques } from './statistiques';
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

function mount<T>(type: Type<T>, inputs: Record<string, unknown> = {}, platform = 'browser') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideStatsKit({ apiUrl: API }), { provide: PLATFORM_ID, useValue: platform }] });
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

describe('page Statistiques', () => {
  afterEach(() => vi.useRealTimers());

  it('charge la période, affiche toutes les sections', async () => {
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    expect(text(el)).toContain('Chargement des statistiques');
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    worlds(http);
    const t = text(el);
    for (const s of ['Statistiques', 'Audience', 'Engagement', 'Objectifs', 'Données du site', 'Demandes reçues', 'Pages vues et visiteurs par jour', 'Ce que les visiteurs en font', 'D’où viennent les visites', 'Dernières 24 heures', 'Quand viennent-ils ?', 'Pages les plus vues', 'Fiches produit', 'Canaux d’acquisition', 'Sources de trafic', 'Régions', 'Navigateurs', 'Actions des visiteurs', 'Demandes par sujet', 'Dernières sessions', 'Ouvrir Umami']) expect(t).toContain(s);
    expect(el.getAttribute('data-sk-mode')).toMatch(/light|dark/);
    expect(el.querySelectorAll('sk-metric-table').length).toBeGreaterThan(15);
    expect(el.querySelectorAll('.sk-funnel li')).toHaveLength(4);
    expect(el.querySelectorAll('.sk-sessions tbody tr')).toHaveLength(12);
    expect(t).toMatch(/\d visiteurs actifs/);
    expect(t).toContain('Meilleur jour :');
    expect(t).toContain('Créneau le plus actif :');
    expect(t).toContain('Mis à jour');
  });

  it('change de période, de dates, de langue ; suspend l’actualisation', async () => {
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0, presets: [1, 7] });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    button(el, '24 h').click();
    http.expectOne(`${API}/overview?days=1`).flush(overview24Json);
    await tick(f);
    expect(text(el)).toContain('Pages vues et visiteurs par heure');
    expect(text(el)).toContain('24 dernières heures');
    button(el, 'Personnalisée').click();
    await tick(f);
    const [from, to] = [...el.querySelectorAll('input[type=date]')] as HTMLInputElement[];
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('change'));
    to.value = '2026-11-07';
    to.dispatchEvent(new Event('change'));
    await tick(f);
    button(el, 'Afficher').click();
    http.expectOne(`${API}/overview?from=2026-11-01&to=2026-11-07`).flush(overview);
    await tick(f);
    button(el, '7 jours').click();
    http.expectOne(`${API}/overview?days=7`).flush(overview);
    await tick(f);
    const pause = el.querySelector('.sk-pause') as HTMLButtonElement;
    pause.click();
    await tick(f);
    expect(pause.getAttribute('aria-pressed')).toBe('true');
    f.componentRef.setInput('locale', 'en');
    f.componentRef.setInput('texts', { stats: { title: 'Audience' } });
    f.componentRef.setInput('theme', 'dark');
    await tick(f);
    expect(text(el)).toContain('Audience');
    expect(text(el)).toContain('Where visits come from');
    expect(el.getAttribute('data-sk-mode')).toBe('dark');
    worlds(http);
  });

  it('direct et actualisation automatique, en silence, avec signalement des échecs', async () => {
    vi.useFakeTimers();
    const { f, http, el } = mount(SkStatistiques, { liveMs: 1000, refreshMs: 5000 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(1000);
    http.expectOne(`${API}/live`).flush({ version: 1, active: 9, at: '' });
    await vi.advanceTimersByTimeAsync(10);
    f.detectChanges();
    expect(text(el)).toContain('9 visiteurs actifs');
    await vi.advanceTimersByTimeAsync(1000);
    http.expectOne(`${API}/live`).flush('', { status: 500, statusText: 'x' });
    await vi.advanceTimersByTimeAsync(10);
    f.detectChanges();
    expect(text(el)).toContain('Direct indisponible');
    await vi.advanceTimersByTimeAsync(1000);
    http.expectOne(`${API}/live`).flush({ version: 1, active: null, at: '' });
    await vi.advanceTimersByTimeAsync(2000);
    http.match(`${API}/live`).forEach((r) => r.flush({ version: 1, active: 1, at: '' }));
    http.expectOne(`${API}/overview?days=30`).flush('', { status: 500, statusText: 'x' });
    await vi.advanceTimersByTimeAsync(10);
    f.detectChanges();
    expect(text(el)).toContain('Pages vues et visiteurs par jour'); // affichage gardé
    document.dispatchEvent(new Event('visibilitychange'));
    http.match(`${API}/live`).forEach((r) => r.flush({ version: 1, active: 1, at: '' }));
    worlds(http);
    f.destroy();
  });

  it('non configuré, Umami en panne, serveur injoignable puis nouvel essai', async () => {
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overviewOffJson);
    await tick(f);
    expect(text(el)).toContain('Statistiques de visites non branchées');
    expect(el.querySelector('.sk-funnel')).toBeNull();
    button(el, '90 jours').click();
    http.expectOne(`${API}/overview?days=90`).flush({ ...overview, status: 'error', error: 'panne' });
    await tick(f);
    expect(text(el)).toContain('momentanément indisponibles');
    button(el, 'Réessayer').click();
    http.expectOne(`${API}/overview?days=90`).flush('', { status: 502, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Les statistiques n’ont pas pu être chargées');
    button(el, 'Réessayer').click();
    http.expectOne(`${API}/overview?days=90`).flush({ ...overview, active: null, previous: null, goals: [], extras: null, pages: [], sessions: [], dashboardUrl: null, totals: { ...overview.totals, visits: 0, visitors: 10 }, series: { ...overview.series, pageviews: overview.series.pageviews.map(() => 0), previousPageviews: null }, heatmap: overview.heatmap.map((r) => r.map(() => 0)) });
    await tick(f);
    const t = text(el);
    expect(t).toContain('Direct indisponible');
    expect(t).toContain('Pas encore assez de visites');
    expect(t).toContain('Aucune session sur la période');
    expect(t).toContain('Peu de visiteurs');
    worlds(http);
  });

  it('extras seuls, sans tableau de pages détaillé, entonnoir sans objectifs', async () => {
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0, report: false });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush({ ...overview, goals: [], pages: [], extras: { tiles: [{ id: 't', label: 'Texte', value: 'ok', previous: null, sub: null, group: 'Maison', highlight: false }], tables: [{ id: 'x', title: 'Tableau maison', sub: 'sous', head: 'H', column: 'C', section: 'pages', items: [{ key: 'k', label: null, value: 1, previous: null }] }], funnel: { label: 'Fin', value: 0 } } });
    await tick(f);
    const t = text(el);
    expect(t).toContain('Tableau maison');
    expect(t).toContain('Maison');
    expect(t).not.toContain('Aperçu du rapport');
    expect(el.querySelectorAll('.sk-funnel li')).toHaveLength(3);
    worlds(http);
  });

  it('entonnoir : dernière étape sans visite engagée', async () => {
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush({ ...overview, goals: [], totals: { ...overview.totals, visits: 0, bounces: 0 }, extras: { tiles: [], tables: [], funnel: { label: 'Fin', value: 2 } } });
    await tick(f);
    expect(text(el)).toContain('Fin');
    worlds(http);
  });

  it('export CSV, impression, aperçu et envoi du rapport', async () => {
    const click = stubDownload();
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0 });
    f.detectChanges();
    http.expectOne(`${API}/overview?days=30`).flush(overview);
    await tick(f);
    const rows = f.componentInstance.csvRows();
    expect(rows[0]).toEqual(['Section', 'Libellé', 'Colonne', 'Valeur']);
    expect(rows.length).toBeGreaterThan(300);
    expect(rows.some((r) => r[0] === 'Pays' && r[1] === 'France')).toBe(true);
    button(el, 'Exporter (CSV)').click();
    expect(click).toHaveBeenCalled();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    button(el, 'Imprimer').click();
    expect(print).toHaveBeenCalled();
    const tab = { location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    button(el, 'Aperçu du rapport').click();
    http.expectOne(`${API}/report/preview?days=30`).flush({ version: 1, subject: 's', html: '<p>x</p>', text: 'x' });
    await tick(f);
    expect(tab.location.href).toBe('blob:x');
    button(el, 'Aperçu du rapport').click();
    http.expectOne(`${API}/report/preview?days=30`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(tab.close).toHaveBeenCalled();
    expect(text(el)).toContain('Le rapport n’a pas pu être généré.');
    open.mockReturnValue(null);
    button(el, 'Aperçu du rapport').click();
    http.expectOne(`${API}/report/preview?days=30`).flush({ version: 1, subject: 's', html: 'x', text: 'x' });
    await tick(f);
    expect(open).toHaveBeenLastCalledWith('blob:x', '_blank');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    button(el, 'Envoyer le rapport').click();
    http.expectNone(`${API}/report/send?days=30`);
    button(el, 'Envoyer le rapport').click();
    http.expectOne((r) => r.method === 'POST' && r.urlWithParams === `${API}/report/send?days=30`).flush({ version: 1, ok: true, recipients: 2, error: null });
    await tick(f);
    expect(text(el)).toContain('Rapport envoyé à 2 destinataires.');
    button(el, 'Envoyer le rapport').click();
    http.expectOne(`${API}/report/send?days=30`).flush({ version: 1, ok: false, recipients: 0, error: 'x' });
    await tick(f);
    expect(text(el)).toContain('Le rapport n’a pas pu être envoyé.');
    button(el, 'Envoyer le rapport').click();
    http.expectOne(`${API}/report/send?days=30`).flush('', { status: 503, statusText: 'x' });
    await tick(f);
    expect(confirm).toHaveBeenCalledTimes(4);
    button(el, 'Personnalisée').click();
    await tick(f);
    button(el, 'Aperçu du rapport').click();
    http.expectOne((r) => r.url === `${API}/report/preview` && r.params.has('from')).flush({ version: 1, subject: 's', html: 'x', text: 'x' });
    worlds(http);
  });

  it('saut vers une section', async () => {
    const { f, http, el } = mount(SkStatistiques, { liveMs: 0, refreshMs: 0 });
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

  it('rendu serveur : rien n’est chargé', () => {
    const { f, http } = mount(SkStatistiques, {}, 'server');
    f.detectChanges();
    http.expectNone(`${API}/overview?days=30`);
  });
});

describe('page Google', () => {
  it('toutes les sections, portée marque, indexation, export', async () => {
    const click = stubDownload();
    const { f, http, el } = mount(SkSearchConsole, { apiUrl: '/api/g' });
    f.detectChanges();
    http.expectOne('/api/g/search?days=28').flush(search);
    await tick(f);
    const t = text(el);
    for (const s of ['Clics depuis Google', 'Affichages dans Google par jour', 'Recherches', 'Requêtes × pages', 'Recherches à fort potentiel', 'Recherches en hausse', 'Recherches en baisse', 'Nouvelles recherches', 'Pages très affichées mais peu cliquées', 'Pages qui ont perdu leurs clics', 'Recherches avec plusieurs pages', 'Pays', 'Appareils', 'Apparence dans les résultats', 'Plan du site (sitemap)', 'Clics « marque »', 'Clics, 7 derniers jours']) expect(t).toContain(s);
    const firstRows = () => text(el.querySelector('#sk-queries sk-metric-table tbody') as Element);
    button(el, 'Marque').click();
    await tick(f);
    expect(firstRows()).toContain('exemple');
    expect(firstRows()).not.toContain('table en chene');
    button(el, 'Hors marque').click();
    await tick(f);
    expect(firstRows()).not.toContain('atelier exemple');
    button(el, 'Toutes').click();
    button(el, 'Vérifier l’indexation').click();
    await tick(f);
    http.expectOne('/api/g/search/indexation').flush(indexationJson);
    await tick(f);
    expect(text(el)).toContain('Indexation des pages');
    expect(text(el)).toContain('Pages indexées');
    expect(f.componentInstance.csvRows().length).toBeGreaterThan(40);
    button(el, 'Exporter (CSV)').click();
    expect(click).toHaveBeenCalled();
    vi.spyOn(window, 'print').mockImplementation(() => {});
    button(el, 'Imprimer').click();
    button(el, '7 jours').click();
    http.expectOne('/api/g/search?days=7').flush({ ...search, brandTerms: [], sitemaps: null, series: search.series.slice(0, 5), totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 } });
    await tick(f);
    expect(text(el)).not.toContain('Clics « marque »');
    expect(text(el)).toContain('Aucun plan du site envoyé à Google.');
  });
  it('indexation en échec, non configuré, erreur avec compte de service, injoignable', async () => {
    const { f, http, el } = mount(SkSearchConsole, { initialDays: 90 });
    f.detectChanges();
    http.expectOne(`${API}/search?days=90`).flush(search);
    await tick(f);
    button(el, 'Vérifier l’indexation').click();
    http.expectOne(`${API}/search/indexation`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('L’indexation n’a pas pu être vérifiée.');
    f.componentInstance.indexation.set({ ...(indexationJson as unknown as IndexationResponse), total: 0, indexed: 0, pages: [] });
    await tick(f);
    expect(text(el)).toContain('0 sur 0 pages indexées');
    button(el, '28 jours').click();
    http.expectOne(`${API}/search?days=28`).flush(searchOffJson);
    await tick(f);
    expect(text(el)).toContain('Connexion à la Search Console non configurée');
    button(el, '365 jours').click();
    http.expectOne(`${API}/search?days=365`).flush({ ...search, status: 'error', error: 'gsc 403' });
    await tick(f);
    expect(text(el)).toContain('Ajoutez ce compte comme utilisateur');
    button(el, 'Réessayer').click();
    http.expectOne(`${API}/search?days=365`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Les statistiques n’ont pas pu être chargées');
    button(el, 'Réessayer').click();
    http.expectOne(`${API}/search?days=365`).flush({ ...search, status: 'error', error: 'x', serviceAccount: null });
    await tick(f);
    expect(text(el)).not.toContain('Ajoutez ce compte');
  });
  it('rendu serveur : rien n’est chargé', () => {
    const { f, http } = mount(SkSearchConsole, {}, 'server');
    f.detectChanges();
    http.expectNone(`${API}/search?days=28`);
  });
});

describe('page YouTube', () => {
  it('chaîne, côté site, évolution, provenance, vidéos, export', async () => {
    const click = stubDownload();
    const { f, http, el } = mount(SkYoutube);
    f.detectChanges();
    http.expectOne(`${API}/youtube?days=28`).flush(youtube);
    await tick(f);
    const t = text(el);
    for (const s of ['Atelier Exemple', '@atelier-exemple', 'Ouvrir YouTube Studio', 'Abonnés', 'Vues totales', 'Minutes regardées', 'Visites venues de YouTube', 'Pages d’arrivée', 'Demandes après une visite venue de YouTube', 'Vues par jour', 'D’où viennent les vues', 'Recherche YouTube', 'Une table en chêne', 'Non répertoriée']) expect(t).toContain(s);
    expect(f.componentInstance.csvRows()[0][0]).toBe('Vidéo');
    button(el, 'Exporter (CSV)').click();
    expect(click).toHaveBeenCalled();
    button(el, '7 jours').click();
    http.expectOne(`${API}/youtube?days=7`).flush({ ...youtube, days: 7, analyticsError: 'quota', channel: { ...youtube.channel!, subscribers: null, thumbnail: 'https://exemple.test/a.png' }, previous: { ...youtube.previous, views: 0 }, site: { ...youtube.site!, visits: null, requests: null }, videos: [{ ...youtube.videos[0], label: 'Film', visibility: 'private', averageViewPercentage: null, publishedAt: null }] });
    await tick(f);
    const u = text(el);
    expect(u).toContain('masqué');
    expect(u).toContain('YouTube Analytics a refusé la demande');
    expect(u).toContain('Film');
    expect(u).toContain('Privée');
    expect(el.querySelector('.sk-channel img')).not.toBeNull();
  });
  it('non configuré, erreur, injoignable, sans côté site', async () => {
    const { f, http, el } = mount(SkYoutube);
    f.detectChanges();
    http.expectOne(`${API}/youtube?days=28`).flush({ ...youtubeOffJson, channelUrl: 'https://www.youtube.com/@demo' });
    await tick(f);
    expect(text(el)).toContain('Chaîne YouTube non branchée');
    expect(button(el, 'Ouvrir la chaîne')).toBeTruthy();
    button(el, '90 jours').click();
    http.expectOne(`${API}/youtube?days=90`).flush({ ...youtubeOffJson, status: 'error', error: 'jeton révoqué' });
    await tick(f);
    expect(text(el)).toContain('jeton révoqué');
    button(el, 'Réessayer').click();
    http.expectOne(`${API}/youtube?days=90`).flush('', { status: 500, statusText: 'x' });
    await tick(f);
    expect(text(el)).toContain('Les statistiques n’ont pas pu être chargées');
    button(el, 'Réessayer').click();
    http.expectOne(`${API}/youtube?days=90`).flush({ ...youtube, site: null, videos: [] });
    await tick(f);
    expect(text(el)).toContain('Aucune vidéo publiée sur la chaîne.');
    expect(f.componentInstance.siteTiles()).toEqual([]);
    f.componentInstance.data.set({ ...youtube, channel: null });
    expect(f.componentInstance.tiles()).toEqual([]);
    f.componentInstance.data.set({ ...youtube, site: { ...youtube.site!, requestsBySubject: [{ key: '', label: null, value: 1, previous: null }] } });
    await tick(f);
    expect(text(el)).toContain('Non précisé');
  });
  it('rendu serveur : rien n’est chargé', () => {
    const { f, http } = mount(SkYoutube, {}, 'server');
    f.detectChanges();
    http.expectNone(`${API}/youtube?days=28`);
  });
});
