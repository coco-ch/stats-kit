import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, signal } from '@angular/core';
import { SkSearchConsole, SkStatistiques, SkYoutube, type ThemeChoice } from 'stats-kit/angular';

type Tab = 'statistiques' | 'google' | 'youtube';
const TABS: Tab[] = ['statistiques', 'google', 'youtube'];

/** Démo : une administration fictive qui intègre les trois pages de la librairie, sur données factices. */
@Component({
  selector: 'demo-root',
  imports: [SkStatistiques, SkSearchConsole, SkYoutube],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    header { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.5rem; padding: .75rem 16px; background: #1d2b53; color: #fff; }
    header strong { font-size: 1.05rem; }
    nav { display: flex; flex-wrap: wrap; gap: .25rem; }
    nav a { color: #dfe6ff; text-decoration: none; padding: .55rem .75rem; border-radius: 6px; font-weight: 600; }
    nav a[aria-current=page] { background: #fff; color: #1d2b53; }
    nav a:focus-visible, select:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .reglages { margin-left: auto; display: flex; flex-wrap: wrap; gap: .75rem; font-size: .85rem; }
    select { margin-left: .35rem; min-height: 36px; font: inherit; }
    main { padding: 20px 16px 48px; max-width: 1680px; margin: 0 auto; }
    @media (max-width: 700px) { .reglages { margin-left: 0; } main { padding: 16px; } }
  `],
  template: `
    <header>
      <strong>Atelier Exemple · administration</strong>
      <nav aria-label="Pages de la démo">
        @for (t of tabs; track t) { <a [href]="'#' + t" [attr.aria-current]="tab() === t ? 'page' : null">{{ names[t] }}</a> }
      </nav>
      <div class="reglages">
        <label>Thème <select [value]="theme()" (change)="theme.set($any($event.target).value)"><option value="auto">Système</option><option value="light">Clair</option><option value="dark">Sombre</option></select></label>
        <label>Langue <select [value]="locale()" (change)="locale.set($any($event.target).value)"><option value="fr">Français</option><option value="en">English</option></select></label>
      </div>
    </header>
    <main>
      @switch (tab()) {
        @case ('google') { <sk-search-console [theme]="theme()" [locale]="locale()" /> }
        @case ('youtube') { <sk-youtube [theme]="theme()" [locale]="locale()" /> }
        @default { <sk-statistiques [theme]="theme()" [locale]="locale()" [texts]="{ stats: { lead: lead[locale()] } }" /> }
      }
    </main>
  `,
})
export class Demo {
  private readonly doc = inject(DOCUMENT);
  protected readonly tabs = TABS;
  protected readonly names: Record<Tab, string> = { statistiques: 'Statistiques', google: 'Google', youtube: 'YouTube' };
  protected readonly lead: Record<string, string> = {
    fr: 'Données factices de démonstration : visites mesurées par un faux Umami, demandes reçues par un faux formulaire.',
    en: 'Demo data: visits measured by a fake Umami, requests received by a fake form.',
  };
  protected readonly tab = signal<Tab>(this.fromHash());
  protected readonly theme = signal<ThemeChoice>((new URLSearchParams(this.doc.location.search).get('theme') as ThemeChoice) || 'auto');
  protected readonly locale = signal(new URLSearchParams(this.doc.location.search).get('lang') || 'fr');

  constructor() {
    this.doc.defaultView?.addEventListener('hashchange', () => this.tab.set(this.fromHash()));
    effect(() => {
      const dark = this.theme() === 'dark' || (this.theme() === 'auto' && !!this.doc.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches);
      this.doc.body.classList.toggle('sombre', dark);
      this.doc.documentElement.lang = this.locale();
    });
  }

  private fromHash(): Tab {
    const h = this.doc.location.hash.slice(1) as Tab;
    return TABS.includes(h) ? h : 'statistiques';
  }
}
