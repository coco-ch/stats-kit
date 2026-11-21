import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, signal } from '@angular/core';
import { LOCALES } from 'stats-kit/contract';
import { SkSearchConsole, SkStatistics, SkYoutube, type HeadingLevel, type ThemeChoice } from 'stats-kit/angular';

type Tab = 'statistics' | 'google' | 'youtube';
/** Sites of the demo: the first one uses the address of provideStatsKit, the second one an `apiUrl` of its own. */
const SITES: Record<string, { name: string; apiUrl: string | null }> = { workshop: { name: 'Example Workshop', apiUrl: null }, shop: { name: 'Example Shop', apiUrl: 'api/admin/shop' } };
const TABS: Tab[] = ['statistics', 'google', 'youtube'];

/** Name of a language in that language ("Deutsch", "français"…). */
const own = (code: string) => new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;

/** Demo: a fictitious administration that embeds the three pages of the library, on fake data. */
@Component({
  selector: 'demo-root',
  imports: [SkStatistics, SkSearchConsole, SkYoutube],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    header { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.5rem; padding: .75rem 16px; background: #1d2b53; color: #fff; }
    header strong { font-size: 1.05rem; }
    nav { display: flex; flex-wrap: wrap; gap: .25rem; }
    nav a { color: #dfe6ff; text-decoration: none; padding: .55rem .75rem; border-radius: 6px; font-weight: 600; }
    nav a[aria-current=page] { background: #fff; color: #1d2b53; }
    nav a:focus-visible, select:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .settings { margin-left: auto; display: flex; flex-wrap: wrap; gap: .75rem; font-size: .85rem; }
    select { margin-left: .35rem; min-height: 36px; font: inherit; }
    main { padding: 20px 16px 48px; max-width: 1680px; margin: 0 auto; }
    @media (max-width: 700px) { .settings { margin-left: 0; } main { padding: 16px; } }
  `],
  template: `
    <header>
      <strong>Example Workshop · administration</strong>
      <nav aria-label="Demo pages">
        @for (t of tabs; track t) { <a [href]="'#' + t" [attr.aria-current]="tab() === t ? 'page' : null">{{ names[t] }}</a> }
      </nav>
      <div class="settings">
        <label>Site <select [value]="site()" (change)="site.set($any($event.target).value)">@for (s of sites; track s.id) { <option [value]="s.id" [selected]="s.id === site()">{{ s.name }}</option> }</select></label>
        <label>Theme <select [value]="theme()" (change)="theme.set($any($event.target).value)"><option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label>Language <select [value]="locale()" (change)="locale.set($any($event.target).value)">@for (l of locales; track l.code) { <option [value]="l.code" [attr.lang]="l.code" [selected]="l.code === locale()">{{ l.name }}</option> }</select></label>
      </div>
    </header>
    <main>
      @switch (tab()) {
        @case ('google') { <sk-search-console [apiUrl]="apiUrl()" [heading]="heading()" [theme]="theme()" [locale]="locale()" /> }
        @case ('youtube') { <sk-youtube [apiUrl]="apiUrl()" [heading]="heading()" [theme]="theme()" [locale]="locale()" /> }
        @default { <sk-statistics [apiUrl]="apiUrl()" [heading]="heading()" [theme]="theme()" [locale]="locale()" /> }
      }
    </main>
  `,
})
export class Demo {
  private readonly doc = inject(DOCUMENT);
  protected readonly tabs = TABS;
  protected readonly names: Record<Tab, string> = { statistics: 'Statistics', google: 'Google', youtube: 'YouTube' };
  protected readonly locales = Object.keys(LOCALES).map((code) => ({ code, name: own(code) }));
  protected readonly tab = signal<Tab>(this.fromHash());
  protected readonly theme = signal<ThemeChoice>((new URLSearchParams(this.doc.location.search).get('theme') as ThemeChoice) || 'auto');
  protected readonly locale = signal(new URLSearchParams(this.doc.location.search).get('lang') || 'en');
  protected readonly sites = Object.entries(SITES).map(([id, s]) => ({ id, name: s.name }));
  protected readonly site = signal(Object.hasOwn(SITES, this.param('site')) ? this.param('site') : 'workshop');
  /** Same page components, another source: they reload by themselves when the address changes. */
  protected readonly apiUrl = computed(() => SITES[this.site()].apiUrl);
  /** `?heading=h2` or `?heading=none`: page title as inside a page that already has its own. */
  protected readonly heading = signal((this.param('heading') || null) as HeadingLevel | null);

  constructor() {
    this.doc.defaultView?.addEventListener('hashchange', () => this.tab.set(this.fromHash()));
    effect(() => {
      const dark = this.theme() === 'dark' || (this.theme() === 'auto' && !!this.doc.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches);
      this.doc.body.classList.toggle('dark', dark);
      this.doc.documentElement.lang = this.locale();
    });
  }

  private param(name: string): string {
    return new URLSearchParams(this.doc.location.search).get(name) ?? '';
  }

  private fromHash(): Tab {
    const h = this.doc.location.hash.slice(1) as Tab;
    return TABS.includes(h) ? h : 'statistics';
  }
}
