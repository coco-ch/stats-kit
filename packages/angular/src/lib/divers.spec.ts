import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SearchOverview } from 'stats-kit/contrat';
import searchJson from '../../../contrat/exemples/search.json';
import { SkTrendChart } from './blocs';
import { SkSearchConsole } from './search-console';
import { resolvedMode, type ThemeChoice } from './theme';

const setup = () => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });

describe('thème', () => {
  it('suit le système en « auto », obéit au choix sinon', () => {
    let listener: ((e: { matches: boolean }) => void) | null = null;
    const remove = vi.fn();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true, addEventListener: (_: string, l: never) => (listener = l), removeEventListener: remove }) });
    setup();
    @Component({ template: '' })
    class Host {
      choice = signal<ThemeChoice>('auto');
      mode = resolvedMode(this.choice);
    }
    const f = TestBed.createComponent(Host);
    expect(f.componentInstance.mode()).toBe('dark');
    listener!({ matches: false });
    expect(f.componentInstance.mode()).toBe('light');
    f.componentInstance.choice.set('dark');
    expect(f.componentInstance.mode()).toBe('dark');
    f.destroy();
    expect(remove).toHaveBeenCalled();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
  });
  it('sans matchMedia : clair', () => {
    const mm = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    setup();
    @Component({ template: '' })
    class Host {
      mode = resolvedMode(signal<ThemeChoice>('auto'));
    }
    expect(TestBed.createComponent(Host).componentInstance.mode()).toBe('light');
    Object.defineProperty(window, 'matchMedia', { value: mm, configurable: true });
  });
});

describe('graphique : largeur mesurée', () => {
  it('redessine à la largeur de la carte, puis se débranche', async () => {
    let cb: ((e: { contentRect: { width: number } }[]) => void) | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(c: never) { cb = c; } observe() {} disconnect() { disconnect(); } });
    setup();
    const f = TestBed.createComponent(SkTrendChart);
    f.componentRef.setInput('title', 'T');
    f.componentRef.setInput('slots', ['2026-11-01', '2026-11-02']);
    f.componentRef.setInput('bar', [1, 2]);
    await f.whenStable();
    cb!([{ contentRect: { width: 900.4 } }]);
    await f.whenStable();
    expect(f.nativeElement.querySelector('svg').getAttribute('viewBox')).toBe('0 0 900 220');
    cb!([{ contentRect: { width: 10 } }]);
    await f.whenStable();
    expect(f.nativeElement.querySelector('svg').getAttribute('viewBox')).toBe('0 0 240 220');
    f.destroy();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('Google : page perdue sans affichage', () => {
  it('position absente quand la page n’est plus affichée', () => {
    setup();
    const f = TestBed.createComponent(SkSearchConsole);
    const s = searchJson as unknown as SearchOverview;
    f.componentInstance.data.set({ ...s, pages: [], previousPages: [{ key: 'https://www.exemple.test/a', clicks: 3, impressions: 10, ctr: 0.3, position: 2 }] });
    const lost = (f.componentInstance as unknown as { opportunities(): { id: string; rows: { values: Record<string, unknown> }[] }[] }).opportunities().find((b) => b.id === 'lost')!;
    expect(lost.rows[0].values).toEqual({ before: 3, impressions: 0, position: null });
  });
});
