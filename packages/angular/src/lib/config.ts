/** Shared configuration of the components: API address, language, site texts. */
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, LOCALE_ID, PLATFORM_ID, effect, inject, untracked, type Provider } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { createTexts, type TextOverrides, type Texts } from 'stats-kit/contract';
import type { HeadingLevel } from './theme';

export interface StatsKitOptions {
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

export const STATS_KIT_OPTIONS = new InjectionToken<StatsKitOptions>('STATS_KIT_OPTIONS');

/** `providers: [provideHttpClient(), provideStatsKit({ apiUrl: '/api/admin/audience', locale: 'fr' })]` */
export const provideStatsKit = (options: StatsKitOptions): Provider[] => [{ provide: STATS_KIT_OPTIONS, useValue: options }];

/** Options in force (defaults without a provider); the language falls back to the application's `LOCALE_ID`. */
export function injectOptions(): StatsKitOptions {
  const options = inject(STATS_KIT_OPTIONS, { optional: true }) ?? { apiUrl: '/api/admin/audience' };
  return options.locale ? options : { ...options, locale: inject(LOCALE_ID, { optional: true }) ?? undefined };
}

/** Texts in force, completed by the overrides of the component. */
export function resolveTexts(o: StatsKitOptions, locale?: string | null, overrides?: TextOverrides | null): Texts {
  const lang = locale ?? o.locale ?? 'en';
  const base = createTexts(lang, o.texts, o.baseTexts);
  return overrides ? createTexts(lang, overrides, base) : base;
}

/** Address of the base map: explicit address, then the `worldUrl` option, then `{apiUrl}/world.json` (apiUrl of the component). */
export function worldAddress(o: StatsKitOptions, apiUrl?: string | null, worldUrl?: string | null): string {
  return worldUrl || o.worldUrl || `${(apiUrl || o.apiUrl).replace(/\/+$/, '')}/world.json`;
}

/**
 * Runs `load` in the browser for the first source address, then again each time the address changes (the `apiUrl` input of a page
 * bound to a site selector, for example): the component reloads its data instead of having to be recreated. `first` is true on
 * the first load only.
 */
export function loadOnSource(base: () => string, load: (first: boolean) => void): void {
  const browser = isPlatformBrowser(inject(PLATFORM_ID));
  let last: string | null = null;
  effect(() => {
    const b = base();
    if (!browser || b === last) return;
    const first = last === null;
    last = b;
    untracked(() => load(first));
  });
}

/** Calls to the library API (HttpClient: the site's interceptors, for authentication for example, apply). */
@Injectable({ providedIn: 'root' })
export class StatsKitApi {
  private readonly http = inject(HttpClient);
  private readonly worlds = new Map<string, Promise<unknown>>();

  get<T>(base: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${base.replace(/\/+$/, '')}${path}`, { params }));
  }

  post<T>(base: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${base.replace(/\/+$/, '')}${path}`, {}, { params }));
  }

  /** Base map, loaded once per address. */
  world(url: string): Promise<unknown> {
    let p = this.worlds.get(url);
    if (!p) {
      p = firstValueFrom(this.http.get(url)).catch((e: unknown) => {
        this.worlds.delete(url);
        throw e;
      });
      this.worlds.set(url, p);
    }
    return p;
  }
}

/** Downloads a text as a file (CSV export). */
export function download(doc: Document, name: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = name;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
