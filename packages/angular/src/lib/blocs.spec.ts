import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { textes, type Item } from 'stats-kit/contrat';
import { SkHeatmap, SkMetricTable, SkTile, SkTileGroups, SkTrendChart, formatCell, type Col, type MRow, type TileData } from './blocs';
import { SkWorldMap } from './carte';
import { StatsKitApi, download, provideStatsKit, resolveTexts } from './config';

const fr = textes('fr');
const setup = () => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideStatsKit({ apiUrl: '/api/x/' })] });

describe('configuration', () => {
  it('textes : configuration puis remplacements du composant', () => {
    expect(resolveTexts({ apiUrl: '', locale: 'en' }).stats.title).toBe('Statistics');
    expect(resolveTexts({ apiUrl: '', texts: { stats: { title: 'A' } } }, null, { stats: { lead: 'B' } }).stats).toMatchObject({ title: 'A', lead: 'B' });
    expect(resolveTexts({ apiUrl: '' }, 'en', null).locale).toBe('en-GB');
  });
  it('appels HTTP et fond de carte chargé une fois', async () => {
    setup();
    const api = TestBed.inject(StatsKitApi);
    const http = TestBed.inject(HttpTestingController);
    const g = api.get('/api/x/', '/live', { a: 1 });
    http.expectOne('/api/x/live?a=1').flush({ ok: 1 });
    expect(await g).toEqual({ ok: 1 });
    const p = api.post('/api/x', '/report/send');
    http.expectOne((r) => r.method === 'POST' && r.url === '/api/x/report/send').flush({ ok: true });
    expect(await p).toEqual({ ok: true });
    const w1 = api.world('/w.json'), w2 = api.world('/w.json');
    http.expectOne('/w.json').flush({ features: [] });
    expect(await w1).toBe(await w2);
    const bad = api.world('/absent.json');
    http.expectOne('/absent.json').flush('', { status: 404, statusText: 'Not Found' });
    await expect(bad).rejects.toBeTruthy();
    const again = api.world('/absent.json');
    http.expectOne('/absent.json').flush({ features: [1] });
    expect(await again).toEqual({ features: [1] });
  });
  it('téléchargement d’un fichier', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    download(document, 'a.csv', 'x');
    vi.runAllTimers();
    vi.useRealTimers();
    expect([create.mock.calls.length, click.mock.calls.length, revoke.mock.calls.length]).toEqual([1, 1, 1]);
  });
});

describe('tuiles', () => {
  it('affiche valeur, évolution, courbe, et passe au second plan à zéro', async () => {
    setup();
    const f = TestBed.createComponent(SkTile);
    f.componentRef.setInput('label', 'Visiteurs');
    f.componentRef.setInput('value', '0');
    f.componentRef.setInput('change', { text: '▼ -5 %', tone: 'down' });
    f.componentRef.setInput('spark', 'M0 0 L1 1');
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    expect(el.classList.contains('sk-zero')).toBe(true);
    expect(el.querySelector('.sk-d--down')?.textContent).toBe('▼ -5 %');
    expect(el.querySelector('svg.sk-spark--down')).not.toBeNull();
  });
  it('range les tuiles par groupe', async () => {
    setup();
    const f = TestBed.createComponent(SkTileGroups);
    const tiles: TileData[] = [{ label: 'A', value: '1', change: null, sub: '', spark: '', group: 'G1' }, { id: 'b', label: 'B', value: '2', change: null, sub: 's', spark: '', group: 'G1', highlight: true }, { label: 'C', value: '3', change: null, sub: '', spark: '' }];
    f.componentRef.setInput('tiles', tiles);
    await f.whenStable();
    const groups = [...f.nativeElement.querySelectorAll('section')] as HTMLElement[];
    expect(groups.map((g) => g.querySelectorAll('sk-tile').length)).toEqual([2, 1]);
    expect(groups[0].querySelector('h2')?.textContent).toBe('G1');
    expect(groups[1].querySelector('h2')).toBeNull();
    expect(f.nativeElement.querySelector('sk-tile.sk-hl')).not.toBeNull();
  });
});

describe('tableau de classement', () => {
  const cols: Col[] = [{ key: 'v', label: 'Vues', delta: true }, { key: 'p', label: 'Part', kind: 'pct', delta: true, lowerBetter: true }, { key: 'pos', label: 'Pos', kind: 'pos', delta: true }, { key: 'd', label: 'Durée', kind: 'dur' }, { key: 't', label: 'Texte', kind: 'text' }, { key: 'x', label: 'Déc', kind: 'dec' }];
  const rows: MRow[] = Array.from({ length: 14 }, (_, i) => ({ label: `ligne ${i}`, sub: i === 3 ? 'détail' : undefined, href: i === 0 ? 'https://exemple.test' : undefined, values: { v: 100 - i, p: 0.1, pos: 3, d: 65, t: i % 2 ? 'b' : 'a', x: i === 2 ? null : 1.5 }, prev: i === 1 ? { v: 50, p: 0.2, pos: 5 } : i === 2 ? { v: null } : undefined }));
  const make = async (r = rows, c = cols) => {
    setup();
    const f = TestBed.createComponent(SkMetricTable);
    f.componentRef.setInput('title', 'Pages vues');
    f.componentRef.setInput('rows', r);
    f.componentRef.setInput('cols', c);
    f.componentRef.setInput('texts', fr);
    await f.whenStable();
    return f;
  };
  it('formats des cellules', () => {
    expect([formatCell(fr, null, 'int'), formatCell(fr, '', 'int'), formatCell(fr, 'texte', 'int'), formatCell(fr, 0.5, 'pct'), formatCell(fr, 61, 'dur'), formatCell(fr, 2.25, 'pos'), formatCell(fr, 1.256, 'dec'), formatCell(fr, 12, 'int')]).toEqual(['—', '—', 'texte', '50,0 %', '1 min 01 s', '2,3', '1,26', '12']);
  });
  it('trie, filtre, déplie, montre les évolutions et la barre', async () => {
    const f = await make();
    const el: HTMLElement = f.nativeElement;
    const body = () => [...el.querySelectorAll('tbody tr')] as HTMLElement[];
    expect(body()).toHaveLength(10);
    expect(el.classList.contains('sk-wide')).toBe(true);
    expect(body()[1].querySelectorAll('.sk-d').length).toBe(3); // +98 %, -10 pt (mieux), position -2 (mieux)
    expect(body()[1].querySelector('.sk-d--up')?.textContent).toContain('+98');
    expect(body()[0].querySelector('a')?.getAttribute('href')).toBe('https://exemple.test');
    expect(body()[3].querySelector('small')?.textContent).toBe('détail');
    expect((body()[0].querySelector('th') as HTMLElement).style.getPropertyValue('--w')).toBe('100%');
    const more = el.querySelector('.sk-mt__more') as HTMLButtonElement;
    more.click();
    await f.whenStable();
    expect(body()).toHaveLength(14);
    expect(more.textContent?.trim()).toBe('Réduire');
    const search = el.querySelector('input[type=search]') as HTMLInputElement;
    search.value = 'détail';
    search.dispatchEvent(new Event('input'));
    await f.whenStable();
    expect(body()).toHaveLength(1);
    search.value = '';
    search.dispatchEvent(new Event('input'));
    const heads = [...el.querySelectorAll('thead button')] as HTMLButtonElement[];
    heads[0].click();
    await f.whenStable();
    expect(body()[0].textContent).toContain('ligne 13'); // croissant
    heads[0].click();
    heads[4].click();
    await f.whenStable();
    expect(el.querySelector('th[aria-sort=descending]')?.textContent).toContain('Texte');
    heads[5].click();
    await f.whenStable();
    expect(body().at(-1)?.textContent).toContain('ligne 2'); // valeur absente en dernier
    expect(f.componentInstance.csvRows()[0]).toEqual(['Pages vues', 'Vues', 'Part', 'Pos', 'Durée', 'Texte', 'Déc']);
    Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    (el.querySelector('.sk-mt__btn') as HTMLButtonElement).click();
  });
  it('tri de textes avec valeurs absentes des deux côtés', async () => {
    const f = await make([{ label: 'a', values: { t: null } }, { label: 'b', values: { t: 'z' } }, { label: 'c', values: { t: 'y' } }, { label: 'd', values: {} }], [{ key: 't', label: 'T', kind: 'text' }]);
    expect(f.componentInstance.filtered().map((r) => r.label)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('vide : message', async () => {
    const f = await make([], cols);
    expect(f.nativeElement.querySelector('.sk-mt__empty')?.textContent).toBe('Aucune donnée sur la période.');
    f.componentRef.setInput('empty', 'Rien.');
    await f.whenStable();
    expect(f.nativeElement.querySelector('.sk-mt__empty')?.textContent).toBe('Rien.');
  });
});

describe('graphique temporel', () => {
  it('barres, courbe, période précédente, graduations, table accessible', async () => {
    setup();
    const f = TestBed.createComponent(SkTrendChart);
    const slots = Array.from({ length: 10 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    f.componentRef.setInput('title', 'Pages vues');
    f.componentRef.setInput('barLabel', 'Pages vues');
    f.componentRef.setInput('lineLabel', 'Visiteurs');
    f.componentRef.setInput('slots', slots);
    f.componentRef.setInput('bar', [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    f.componentRef.setInput('line', [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    f.componentRef.setInput('prev', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    f.componentRef.setInput('foot', 'Pied');
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelectorAll('rect.sk-bar')).toHaveLength(10);
    expect(el.querySelector('rect.sk-bar')?.getAttribute('height')).toBe('0');
    expect(el.querySelector('path.sk-line')?.getAttribute('d')).toMatch(/^M/);
    expect(el.querySelector('path.sk-prev')).not.toBeNull();
    expect(el.querySelectorAll('.sk-tc__legend li')).toHaveLength(3);
    expect(el.querySelector('svg')?.getAttribute('aria-label')).toMatch(/^Pages vues : 450 au total/);
    expect(el.querySelectorAll('.sk-sr tbody tr')).toHaveLength(10);
    expect(el.querySelector('.sk-tc__foot')?.textContent).toBe('Pied');
    expect([...el.querySelectorAll('text.sk-tick')].map((t) => t.getAttribute('text-anchor'))).toContain('end');
  });
  it('heures, un seul créneau, sans courbe', async () => {
    setup();
    const f = TestBed.createComponent(SkTrendChart);
    f.componentRef.setInput('title', 'H');
    f.componentRef.setInput('slots', ['2026-11-16T09']);
    f.componentRef.setInput('unit', 'hour');
    f.componentRef.setInput('bar', [3]);
    await f.whenStable();
    expect(f.nativeElement.querySelector('path.sk-line')).toBeNull();
    expect(f.nativeElement.querySelector('text.sk-tick:last-of-type')?.textContent).toBe('9 h');
    f.componentRef.setInput('slots', []);
    f.componentRef.setInput('bar', []);
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('rect.sk-bar')).toHaveLength(0);
  });
});

describe('carte de chaleur', () => {
  it('7 × 24 cases, intensité, résumé', async () => {
    setup();
    const f = TestBed.createComponent(SkHeatmap);
    const grid = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (d === 0 && h === 9 ? 10 : 0)));
    f.componentRef.setInput('grid', grid);
    f.componentRef.setInput('summary', 'lundi 9 h');
    await f.whenStable();
    const cells = f.nativeElement.querySelectorAll('.sk-heat__cell') as NodeListOf<HTMLElement>;
    expect(cells).toHaveLength(168);
    expect(cells[9].style.opacity).toBe('1');
    expect(cells[9].title).toBe('lundi 9 h : 10 pages vues');
    expect(f.nativeElement.querySelector('[role=img]')?.getAttribute('aria-label')).toBe('Quand viennent-ils ? lundi 9 h');
  });
});

describe('carte du monde', () => {
  const world = { features: [
    { properties: { iso2: 'FR' }, geometry: { type: 'Polygon', coordinates: [[[0, 45], [5, 45], [5, 50], [0, 45]]] } },
    { properties: { iso2: 'US' }, geometry: { type: 'MultiPolygon', coordinates: [[[[-100, 30], [-90, 30], [-90, 40], [-100, 30]]]] } },
  ] };
  @Component({ imports: [SkWorldMap], template: `<sk-world-map [countries]="countries()" [worldUrl]="url()" [low]="low()" [high]="high()" />` })
  class Host {
    countries = signal<Item[]>([{ key: 'fr', label: null, value: 10, previous: null }, { key: 'LU', label: null, value: 2, previous: null }]);
    url = signal<string | null>(null);
    low = signal<string | null>(null);
    high = signal<string | null>(null);
  }
  it('pays coloriés, pastilles, infobulle, zoom et déplacement', async () => {
    setup();
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(Host);
    await f.whenStable();
    http.expectOne('/api/x/world.json').flush(world);
    await new Promise((r) => setTimeout(r));
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    const paths = el.querySelectorAll('path.sk-map__land') as NodeListOf<SVGPathElement>;
    expect(paths).toHaveLength(2);
    expect(paths[0].classList.contains('sk-map__on')).toBe(true);
    expect(paths[0].style.fill).toContain('color-mix');
    expect(el.querySelectorAll('circle.sk-map__dot')).toHaveLength(2);
    expect(el.querySelector('svg')?.getAttribute('aria-label')).toBe('D’où viennent les visites : France 10 visites, Luxembourg 2 visites');
    paths[0].dispatchEvent(new Event('pointerenter'));
    await f.whenStable();
    expect(el.querySelector('.sk-map__tip')?.textContent).toBe('France — 10 visites');
    el.querySelector('circle')!.dispatchEvent(new Event('pointerenter'));
    paths[1].dispatchEvent(new Event('pointerenter')); // pays sans visite : rien
    el.querySelector('.sk-map__frame')!.dispatchEvent(new Event('pointerleave'));
    await f.whenStable();
    expect(el.querySelector('.sk-map__tip')).toBeNull();
    const svg = el.querySelector('svg')!;
    const [zin, zout, reset] = [...el.querySelectorAll('.sk-map__zoom button')] as HTMLButtonElement[];
    const pointer = (type: string, x: number) => Object.assign(new Event(type), { clientX: x, clientY: x, pointerId: 1 });
    svg.dispatchEvent(pointer('pointerdown', 0)); // pas de déplacement sans zoom
    svg.dispatchEvent(pointer('pointermove', 50));
    zin.click();
    await f.whenStable();
    expect(svg.getAttribute('viewBox')).toBe('187.5 73.9 625.0 246.3');
    svg.dispatchEvent(pointer('pointerdown', 100));
    svg.dispatchEvent(pointer('pointermove', 50));
    svg.dispatchEvent(pointer('pointerup', 50));
    await f.whenStable();
    expect(svg.getAttribute('viewBox')).not.toBe('187.5 73.9 625.0 246.3');
    zout.click();
    zout.click();
    await f.whenStable();
    expect(svg.getAttribute('viewBox')).toBe('0.0 0.0 1000.0 394.0');
    zin.click();
    reset.click();
    await f.whenStable();
    expect(svg.getAttribute('viewBox')).toBe('0.0 0.0 1000.0 394.0');
    f.componentInstance.low.set('#000000');
    f.componentInstance.high.set('#ffffff');
    await f.whenStable();
    expect((el.querySelector('path.sk-map__on') as SVGPathElement).style.fill).toMatch(/rgb\(255, 255, 255\)|#ffffff/);
  });
  it('fond de carte indisponible : carte vide, pas d’erreur', async () => {
    setup();
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(Host);
    f.componentInstance.url.set('/autre.json');
    await f.whenStable();
    http.expectOne('/autre.json').flush('', { status: 500, statusText: 'Erreur' });
    await new Promise((r) => setTimeout(r));
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('path.sk-map__land')).toHaveLength(0);
  });
});
