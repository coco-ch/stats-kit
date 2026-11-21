/** Configuration commune des composants : adresse de l'API, langue, textes du site. */
import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject, type Provider } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { textes, type TextOverrides, type Texts } from 'stats-kit/contrat';

export interface StatsKitOptions {
  /**
   * Adresse où le serveur monte les routes de la librairie (« /api/admin/audience »). Éviter « analytics », « stats » ou « track »
   * dans l'adresse : les bloqueurs de publicités bloquent ces appels.
   */
  apiUrl: string;
  /** Langue des textes : « fr » (défaut), « en », ou une autre avec `baseTexts`. */
  locale?: string;
  /** Remplacements de textes (réglages du site). */
  texts?: TextOverrides;
  /** Textes complets d'une autre langue. */
  baseTexts?: Texts;
}

export const STATS_KIT_OPTIONS = new InjectionToken<StatsKitOptions>('STATS_KIT_OPTIONS');

/** `providers: [provideHttpClient(), provideStatsKit({ apiUrl: '/api/admin/audience' })]` */
export const provideStatsKit = (options: StatsKitOptions): Provider[] => [{ provide: STATS_KIT_OPTIONS, useValue: options }];

/** Options en vigueur (valeurs par défaut sans fournisseur). */
export const injectOptions = (): StatsKitOptions => inject(STATS_KIT_OPTIONS, { optional: true }) ?? { apiUrl: '/api/admin/audience' };

/** Textes en vigueur, complétés par les remplacements propres au composant. */
export function resolveTexts(o: StatsKitOptions, locale?: string | null, overrides?: TextOverrides | null): Texts {
  const base = textes(locale ?? o.locale ?? 'fr', o.texts, o.baseTexts);
  return overrides ? textes(locale ?? o.locale ?? 'fr', overrides, base) : base;
}

/** Appels à l'API de la librairie (HttpClient : les intercepteurs du site, d'authentification par exemple, s'appliquent). */
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

  /** Fond de carte, chargé une seule fois par adresse. */
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

/** Télécharge un texte comme fichier (export CSV). */
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
