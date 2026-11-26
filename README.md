# stats-kit

Website traffic statistics for a site's administration, ready to plug in:

- **server** (Node, no framework imposed, Express middleware included): **Umami** connector (API v2 and v3, self-hosted or Cloud), **Google Search Console** (service account or OAuth) and **YouTube** (Data and Analytics, OAuth); periods, comparison with the previous period, live count, last 24 hours, day × hour heatmap, entry and exit pages, geography; **weekly report** in Outlook-compatible HTML (760 px, images attached as `cid:`), world map PNG drawn on the server, preview, scheduling. Sending stays with the site: the library sends nothing.
- **standalone Angular components**: a complete **Statistics** page, **Google** (Search Console) and **YouTube** pages, and their building blocks (tiles, sortable tables exportable to CSV, charts, SVG world map, heatmap). Themed with CSS variables, light and dark, accessible (WCAG 2.1 AA checked with axe-core), usable on a phone, full width, without any global style.
- **a .NET server** (NuGet package `StatsKit.Server`, ASP.NET Core, no dependency beyond the framework): the same routes and the same answers as the Node server for Umami, the same e-mail report with its PNG world map and its preview, checked against the Node server by contract tests ([below](#server-side-aspnet-core)).
- **a single data contract** (TypeScript types and JSON schema, [docs/CONTRACT.md](docs/CONTRACT.md)): a server written in another language can return the same responses and use the same components.
- **labels in eleven languages** — English (default), French, German, Spanish, Italian, Portuguese, Dutch, Russian, Chinese (simplified), Japanese and Korean — in the pages, the e-mail report, its preview and the map; numbers, percentages, durations, dates, weekdays, country and language names follow the chosen locale (Intl). Any label can be overridden by the site.

No runtime dependency on the server; in the browser, only Angular.

![Statistics page of the demo](screenshots/statistics-light.png)

More screenshots (fake demo data): [dark](screenshots/statistics-dark.png), [phone](screenshots/statistics-phone.png), [Google](screenshots/google.png), [YouTube](screenshots/youtube-dark.png), [e-mail report](screenshots/report.png) (on a [phone](screenshots/report-phone.png), in [dark mode](screenshots/report-phone-dark.png)), [French](screenshots/statistics-french.png), [German](screenshots/statistics-german.png).

## Installation (without an npm registry)

The package installs straight from Git. Two options:

```sh
# Released version: the tag contains the packages already built (immediate installation, recommended)
npm i github:manueldelarque/stats-kit#v0.2.8

# Main branch: the packages are built at installation ("prepare" script, one to two minutes)
npm i github:manueldelarque/stats-kit
```

Within a set of repositories, a path works too: `npm i ../stats-kit` (run `npm install` in `stats-kit` first, which builds the packages). With a symbolic link, Angular may need `"preserveSymlinks": true` in the build options.

The package exposes three entry points: `stats-kit/server`, `stats-kit/angular` and `stats-kit/contract` (types, texts, pure functions; JSON schema under `stats-kit/contract/schema.json`). Node 22.18 or later; Angular 21 or later.

If the repository changes owner, only the address above changes: nothing else in the code mentions it.

## Server side (Express, ten lines)

```ts
import express from 'express';
import { createStatsKit, sourcesFromEnv } from 'stats-kit/server';

const stats = createStatsKit({
  siteName: 'My site',
  timeZone: 'Europe/Paris',
  locale: 'en', // language of the report: en, fr, de, es, it, pt, nl, or a regional tag ("fr-CH")
  ...sourcesFromEnv(), // UMAMI_*, GSC_*, YOUTUBE_* (see below)
  report: { theme: { brand: '#1d3c9c' }, statsUrl: 'https://www.example.org/admin/statistics', send: (m) => mySend(m) },
});
app.use('/api/admin/audience', requireAdmin, stats.middleware());
```

`mySend(message)` receives `{ subject, html, text, attachments: [{ cid, filename, contentType, content }] }` and sends it the site's way (nodemailer, a provider's API…); it returns the number of recipients. With nodemailer: `attachments: m.attachments.map((a) => ({ cid: a.cid, filename: a.filename, contentType: a.contentType, content: Buffer.from(a.content) }))`.

The middleware also plugs into `node:http`. For another framework, `stats.handle({ method, path, query })` returns `{ status, headers, body }`. The methods `stats.overview()`, `stats.search()`, `stats.youtube()`, `stats.report()`, `stats.sendReport()` give the same data without HTTP.

**API address**: avoid "analytics", "stats" or "track" in the path, which ad blockers block (`/api/admin/audience` passes). **Protect** the routes: they expose audience data; the library does not handle authentication.

Routes (relative to the mount point): `GET /overview`, `GET /live`, `GET /search`, `GET /search/indexation`, `GET /youtube`, `GET /report/preview`, `POST /report/send`, `GET /world.json`. Periods: `?days=7` (1 = last 24 hours, up to 366) or `?from=YYYY-MM-DD&to=YYYY-MM-DD`.

### Weekly report

```ts
import { startWeeklyReport } from 'stats-kit/server';

startWeeklyReport({
  schedule: { weekday: 1, hour: 8, timeZone: 'Europe/Paris' }, // on Mondays from 8 am; a missed report is caught up until Wednesday (catchUpDays: 3)
  getLastSent: () => myDb.read('report.week'),                 // "2026-W47": once a week only, even with several instances
  setLastSent: (week) => myDb.write('report.week', week),
  send: async () => (await stats.sendReport({ days: 7 }, true)).ok,
});
```

The preview (`GET /report/preview`) returns the message as it would be sent, images included in the page.

A site tile (`extras.tiles`) may carry a `link` (`{ url, label }`: "Open the requests"): it is shown under the figure on the Statistics page and, for a highlighted tile, at the end of its line in the report.

What the report contains, in this order:

- a **sentence that sums up the period**, also the preheader of the message ("Quieter week: 404 visitors, 4% fewer; France still in the lead"), and a **subject with the figures** ("Example Workshop — 404 visitors this week (−4%)");
- the **business figures of the site** when it gives them (`report.business`): requests received and to handle, customers, trials, subscriptions, revenue, documents, messages, costs… in one card, four per row (two by two on a phone), by group, with their change, a small chart, an amber background for what is to handle and a link to the screen where to act; then the state of the services and the alerts. The traffic follows under its own title ("Website audience"). Shown even when Umami is not connected;
- the **key figures** (visitors, page views, visits, bounce rate) with their change and a **small chart** each (the trend of the period day by day: visitors, page views, visits, bounce rate, and each goal; a period counted by hour, or longer than 31 days, has no chart for visits and bounce rate), then the average duration, pages per visit and visits per visitor, each with its change; the goals;
- the site data, an "At a glance" card (top source, country, page and entry page, best day, busiest slot; `report.glance: false` to remove it), **rising and falling** pages and sources, the world map, page views per day next to the previous period day by day, the heatmap;
- **Google** (clicks, impressions, click-through rate, average position, each with its change; top queries; pages gaining clicks) and **YouTube** (views, minutes watched, subscribers, visits and requests from YouTube; most viewed videos), only when the source is connected: no empty block;
- the rankings (the languages are the browser languages of the visitors, "fr-FR" and "fr" together, in visitors; the language of the pages viewed comes apart, for a multilingual site), then the site's own cards.

Under 600 px the key figures go two by two and the cards one above the other (Apple Mail, iOS, Gmail, Outlook.com…); clients that read a style sheet get dark colours in dark mode, the others get plain colours that they invert well and images on a transparent background. Tables and inline styles only (Outlook), a plain-text version, images attached as PNG (`cid:`). Amounts in the site's cards are best written with `formatMoney(stats.texts, 12.5, 'USD')` ("$12.50", "12,50 $", "1 490 €"). Options of `report`:

```ts
report: {
  // …
  // Site-specific cards, after the rankings, in the site's language (costs, requests, news…). A failure only removes them.
  blocks: async (overview) => [{ title: 'Cost of the site', hint: 'Monthly estimate', figures: [{ value: '$14.30', label: 'per month', sub: '$171.60 per year' }], lines: ['No usage-based service'] }],
  // Business figures at the top, read at every report, in the site's language (a failure only removes them). Leave out a figure
  // the site cannot read: never a zero standing for "unknown". `currency`: the number is written as an amount in the report's language.
  business: async (overview) => ({
    // title: 'Your business' and hint: 'From your own data, over the same period' by default (report.businessTitle / businessHint)
    kpis: [
      { id: 'requests', label: 'Requests received', value: 5, previous: 2, group: 'Requests', series: [0, 1, 0, 2, 1, 0, 1] },
      { id: 'to-handle', label: 'To handle', value: 2, highlight: true, group: 'Requests', link: { url: 'https://www.example.org/admin/requests', label: 'Open →' } },
      { id: 'customers', label: 'Customers', value: 12, sub: '3 in trial', group: 'Customers' },
      { id: 'revenue', label: 'Monthly revenue', value: 1490, previous: 1290, currency: 'EUR', group: 'Customers' },
      { id: 'costs', label: 'Costs this month', value: 43.5, currency: 'EUR', lowerIsBetter: true },
    ],
    status: { tone: 'warn', title: 'One point needs your attention', lines: ['Backup one day late'] }, // 'ok' | 'warn' | 'down'
    link: { url: 'https://www.example.org/admin', label: 'Open the administration →' },
  }),
  // Google and YouTube figures read by the site itself (another kit, its own YouTube reading…): a field given replaces the
  // connector of this kit, `null` removes the block. Same as `Report.Sources` in .NET.
  sources: async (range) => ({ youtube: await myYoutubeOverview(range.days), videos: await myTopVideos(range) }),
  // Texts edited in the site's administration, read again at every report (over `texts`; the pages keep the texts of the creation).
  texts: async () => ({ report: { subjectWeekly: await myDb.read('report.subject'), intro: await myDb.read('report.intro') } }),
  // Links at the end of the Google and YouTube blocks, to the pages of the administration.
  searchUrl: 'https://www.example.org/admin/google',
  // Colours of the PNG world map (default: derived from theme.brand).
  // theme: { brand: '#1d3c9c', map: { background: '#e9eefa', land: '#d0d7ea', low: '#96aaeb', high: '#1d3c9c' } },
  youtubeUrl: 'https://www.example.org/admin/youtube',
  // Colours in dark mode, for the clients that apply them (default: dark neutral backgrounds, light texts).
  // theme: { brand: '#1d3c9c', dark: { page: '#111318', card: '#1b1e26', accent: '#8fa6e8' } },
},
// The subject, title, introduction and footer may use {site}, {period}, {from}, {to}, {days}, and the totals {visitors}, {visits},
// {pageviews} and {change} (change of visitors, "+12 %"); empty brackets left by a missing {change} are removed from the subject.
texts: { report: { subjectWeekly: '{site} — the week: {visitors} visitors ({change})' } },
```

## Server side (ASP.NET Core)

The package `StatsKit.Server` (in `packages/dotnet`, .NET 10 or later) is a server of the same contract for ASP.NET Core sites: the same routes, the same JSON, the same e-mail report (HTML for Outlook, PNG world map attached as `cid:`, plain text) in the same languages. It depends on nothing but the ASP.NET Core shared framework.

```sh
dotnet add package StatsKit.Server
```

```csharp
using StatsKit;
using StatsKit.Report;

builder.Services.AddStatsKit((sp, o) =>
{
    o.SiteName = "My site";
    o.Locale = "en";                       // en, fr, de, es, it, pt, nl, ru, zh, ja, ko, or "fr-CH"…
    o.TimeZone = "Europe/Paris";
    o.Umami = UmamiOptions.FromValues(key => builder.Configuration[key]); // UMAMI_API_URL, UMAMI_WEBSITE_ID, UMAMI_USERNAME…
    o.Report.Theme = new ReportTheme { Brand = "#1d3c9c" };
    o.Report.StatsUrl = "https://www.example.org/admin/statistics";
    o.Report.Send = (message, ct) => MySendAsync(message, ct); // returns the number of recipients
});

app.MapStatsKit("/api/admin/audience").RequireAuthorization("admin");
```

- `ReportMessage` has `Subject`, `Html`, `Text` and `Attachments` (`Cid`, `FileName`, `ContentType`, `Content`): send it with Microsoft Graph, SMTP… as the site does. The library sends nothing.
- The same settings as in Node: `Pages` (languages, labels, groups), `EventLabels`, `Goals`, `Extras` (site data, shown even without Umami), `Report.Blocks` (site-specific cards), `Report.Business` (business figures at the top: `ReportBusiness`, `BusinessKpi`, `BusinessStatus`), `Report.Glance`, `Texts["report.footer"] = "…"` (overrides by path), `BaseTexts` (a language the library does not ship), `CacheTtl`.
- Without ASP.NET routing: `kit.HandleAsync(new KitRequest("GET", "/overview", query))` returns `{ Status, Headers, Body }`; `kit.OverviewAsync()`, `kit.LiveAsync()`, `kit.ReportAsync()`, `kit.SendReportAsync()` give the data. `kit.Umami.GetAsync("stats", …)` reads Umami directly with the same account (for a site's own alerts).
- Weekly report: register a `WeeklyReportService` (hosted service) with a `WeeklySchedule { Weekday = 1, Hour = 8, TimeZone = "Europe/Paris" }` (a missed report is caught up during `CatchUpDays` days, 3 by default, as in Node), the reading and writing of the last week sent (database: once a week only, even with several instances) and the sending (`(await kit.SendReportAsync(RangeQuery.ForDays(7), weekly: true)).Ok`).
- Search Console and YouTube are not connected by the .NET server yet: `/search`, `/search/indexation` and `/youtube` answer "not configured" (the pages then show what to do). Their blocks of the report are there: give their figures with `Report.Sources = (range, ct) => …` (`ReportSources(SearchOverview, YoutubeOverview, Videos)`, read for instance from a Node stats-kit server with `ContractJson.Deserialize<SearchOverview>(json)`); without them, no block. Links to the Google and YouTube pages: `Report.SearchUrl`, `Report.YoutubeUrl`; texts read again at every report: `Report.Texts = ct => …` (overrides by path); map and dark-mode colours: `ReportTheme.Map`, `ReportTheme.Dark`; amounts: `Format.Money(kit.Texts, 12.5, "USD")`.
- Formats do not depend on the machine: numbers, dates, units, country and language names are rebuilt from a snapshot of Intl shipped with the package (`npm run dotnet:data`), so a container in invariant globalization mode writes the same report. Regional tags outside the snapshot use the formats of their language.

**Same answers as Node, checked**: `npm run dotnet:golden` runs the Node server on the simulated Umami of the demo and records every call it makes and every answer it gives (overview, live count, report preview in every language with Google and YouTube, errors, unconfigured source); the .NET tests (`packages/dotnet`) replay the same calls and require the same JSON, the same report HTML and text, and the same pixels for the map and the charts. CI fails if the fixtures are not up to date.

### Publishing the NuGet package

Pushing a `v*` tag (`npm run release`) runs `.github/workflows/dotnet-release.yml`: tests, `dotnet pack` with the tag's version, the `.nupkg` attached to the GitHub release of the tag, then publication on nuget.org **only if** the repository has the `NUGET_API_KEY` secret (otherwise the run ends with a note and nothing is published). To enable it once, the owner of the repository:

1. signs in to [nuget.org](https://www.nuget.org) with his own account (a Microsoft account; the package is published under this account's name);
2. opens **API Keys → Create**: key name `stats-kit GitHub`, expiration 365 days, scope **Push** (new packages and new versions), glob pattern `StatsKit.*`;
3. copies the key and adds it to the repository: **Settings → Secrets and variables → Actions → New repository secret**, name `NUGET_API_KEY`;
4. runs the workflow again for the latest tag (**Actions → .NET package → Run workflow**, tag `vX.Y.Z`), or waits for the next tag.

The key expires: renew it on nuget.org and replace the secret. Until the package is on nuget.org, a site can use the `.nupkg` of the release from a local folder (`nuget.config` with `<add key="local" value="packages" />`).

## Angular side (ten lines)

```ts
// app.config.ts
providers: [provideHttpClient(), provideStatsKit({ apiUrl: '/api/admin/audience', locale: 'en' })]

// a page of the administration
import { SkStatistics, SkSearchConsole, SkYoutube } from 'stats-kit/angular';
@Component({ imports: [SkStatistics], template: `<sk-statistics theme="auto" />` })
export class StatisticsPage {}
```

Calls go through `HttpClient`: the site's interceptors (authentication token…) apply. Useful inputs:

| Component | Inputs |
|---|---|
| `<sk-statistics>` | `apiUrl`, `locale`, `texts`, `theme` (`auto`, `light`, `dark`), `heading`, `presets` (`[1, 7, 30, 90]`), `initialDays`, `report` (report buttons), `liveMs`, `refreshMs`, `worldUrl` |
| `<sk-search-console>` | `apiUrl`, `locale`, `texts`, `theme`, `heading`, `presets` (`[7, 28, 90, 365]`), `initialDays` |
| `<sk-youtube>` | `apiUrl`, `locale`, `texts`, `theme`, `heading`, `presets` (`[7, 28, 90]`), `initialDays` |

- **Several sites, one page**: bind `apiUrl` to a site selector (`<sk-statistics [apiUrl]="'/api/admin/audience/' + siteId()" />`, one kit mounted per site on the server). When the address changes, the page reloads its data and its map by itself, keeps the chosen period, and ignores a late answer of the previous site: no need to recreate it.
- **Page title** (`heading`): `h1` (default, a page of its own), `h2` (a tab or a part of a page that already has its `h1`, to keep the heading levels in order for screen readers), or `none` (no title nor lead: the host page shows its own; the period buttons and actions stay). The sections of the pages are `h2`. Also available for all components at once: `provideStatsKit({ heading: 'h2', … })`.
- **World map**: its base map is read at `{apiUrl}/world.json`, with the `apiUrl` of the page that shows it (its input, otherwise the one of `provideStatsKit`), so it follows the selected site. Another address can be given with the `worldUrl` input or the `worldUrl` option of `provideStatsKit` (a static file, a CDN).
- **Administration served under a sub-path** (`https://example.org/console/`, behind a reverse proxy): give a relative `apiUrl`, without a leading slash (`provideStatsKit({ apiUrl: 'api/admin/audience' })`). The browser resolves it against the page's `<base href="/console/">`, and the base map with it. An address starting with `/` always points to the root of the domain.

The building blocks (`sk-tile-groups`, `sk-metric-table`, `sk-trend-chart`, `sk-world-map`, `sk-heatmap`) can be used alone to compose other pages. The world map is drawn in SVG, without Leaflet: no CommonJS dependency, no external stylesheet, no `allowedCommonJsDependencies` setting.

The styles of a page stay under 16 kB; if the site has a tighter `anyComponentStyle` budget, raise it to 16 kB.

## Languages

| Code | Language | Default format tag |
|---|---|---|
| `en` | English (default and fallback) | `en-GB` |
| `fr` | French | `fr-FR` |
| `de` | German | `de-DE` |
| `es` | Spanish | `es-ES` |
| `it` | Italian | `it-IT` |
| `pt` | Portuguese (Portugal) | `pt-PT` |
| `nl` | Dutch | `nl-NL` |
| `ru` | Russian | `ru-RU` |
| `zh` | Chinese (simplified) | `zh-CN` |
| `ja` | Japanese | `ja-JP` |
| `ko` | Korean | `ko-KR` |

- **Choosing the language**: `locale` on `createStatsKit` (report), on `provideStatsKit` (all components) or on each page. Without it, the components follow the application's `LOCALE_ID`, then English. A tag with a region keeps the texts of the language and formats numbers and dates the regional way: `locale: 'de-CH'` gives German labels and Swiss number grouping (`1'234`). An unknown language falls back to English.
- **Formats**: numbers, percentages, durations, dates, weekdays, hours, country and language names come from `Intl` in the chosen locale; plural forms use `Intl.PluralRules`; CSV exports use `;` where the decimal separator is a comma (what Excel expects there) and `,` otherwise.
- **Overriding a label**: any text can be replaced, on the server (`texts` of `createStatsKit`, for the report) and in Angular (`texts` of `provideStatsKit` or of each page):

  ```ts
  provideStatsKit({ apiUrl: '/api/admin/audience', locale: 'fr', texts: { stats: { title: 'Audience', lead: 'Visites du site, sans cookie.' } } });
  createStatsKit({ /* … */ locale: 'fr', texts: { report: { intro: 'Bonjour,\nvoici le point de la semaine.', footer: 'Envoyé chaque lundi.' } } });
  ```

- **A language the library does not ship**: pass complete texts as `baseTexts` (same shape as `LOCALES.en`, from `stats-kit/contract`), with `locale` set to its tag for the formats.
- **Adding a language to the library**: add `packages/contract/src/locales/<code>.ts` (copy `en.ts`, translate every text, keep the `{variables}`) and register it in `packages/contract/src/locales/index.ts`. The tests check that every locale has exactly the same keys and variables as English and that every file of the folder is registered; then run `npm run dotnet:data` so that the .NET server has it too. Right-to-left languages are not shipped yet: the components would need `dir="rtl"` handling first.

## Settings

### Sources (environment variables read by `sourcesFromEnv`)

| Source | Variables |
|---|---|
| Umami | `UMAMI_API_URL`, `UMAMI_WEBSITE_ID`, and `UMAMI_USERNAME` + `UMAMI_PASSWORD` (read-only service account) or `UMAMI_API_KEY` (Umami Cloud); `UMAMI_DASHBOARD_URL` (`false` to hide the button) |
| Search Console | `GSC_SITE` ("sc-domain:example.org"), `GSC_SERVICE_ACCOUNT` (JSON key, raw or base64) or `GSC_OAUTH` (`{client_id, client_secret, refresh_token}`), `GSC_SITEMAP_URL` (indexing check) |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` (channel owner), `YOUTUBE_CHANNEL_ID` (expected channel), `YOUTUBE_CHANNEL_URL` |

A source without settings is reported as "not configured"; a source that does not answer is reported as "unavailable" without preventing the rest from showing. Settings can also be passed directly (`umami: { url, websiteId, username, password }`…).

Umami ignores headless browsers: to check real counting, open the site in a real browser.

### Securing a new Umami

A self-hosted Umami is installed with the account `admin` and a well-known default password. Anyone who reaches its address can sign in with it until it is changed. Before connecting the library:

1. Sign in to Umami as `admin`, open **Profile → Change password**, and set a long random password (generate it in your password manager and keep it there). Or with the API, without the passwords appearing in the command line nor in the shell history (they are read from variables set beforehand, for example by your secret manager):

   ```sh
   # UMAMI_URL, UMAMI_ADMIN_TOKEN (from POST /api/auth/login), UMAMI_OLD_PASSWORD and UMAMI_NEW_PASSWORD set beforehand
   node -e 'const e = process.env; fetch(e.UMAMI_URL + "/api/me/password", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + e.UMAMI_ADMIN_TOKEN }, body: JSON.stringify({ currentPassword: e.UMAMI_OLD_PASSWORD, newPassword: e.UMAMI_NEW_PASSWORD }) }).then((r) => console.log(r.status))'
   ```

2. Create a dedicated account for the library (**Settings → Users**, role *View only*), give it access to the website (through a team in recent versions), and put **this** account in `UMAMI_USERNAME` / `UMAMI_PASSWORD`, never `admin`.
3. Store these values in the hosting's secret variables, not in the repository.

The library does not change the password itself, on purpose: it only reads, with a read-only account, and has no place to keep a new secret safely; a password changed at start-up and then lost (crash before it is stored, two instances starting together) would lock the administrators out of Umami. When the connector is configured with the default account of a new Umami, the server writes a warning at start-up (`[stats-kit] Umami: the connector signs in with the default account…`), which names neither the account nor the password. `umamiDefaultAccount(config)` (from `stats-kit/server`) gives the same check, for a health page for example.

### Site data

```ts
createStatsKit({
  // …
  pages: {
    languages: ['en', 'fr'],                         // /en/contact and /fr/contact count as /contact
    labels: { '/': 'Home', '/contact': 'Contact' },
    groups: [{ id: 'products', title: 'Most viewed products', pattern: /^\/products\/([a-z0-9-]+)$/ }],
  },
  events: { labels: { 'phone-click': 'Click to call' } },
  goals: [{ id: 'calls', label: 'Clicks to call', events: ['phone-click'] }],
  // Data from the site's database, shown even if Umami does not answer (tiles, tables, last funnel step):
  extras: async (range) => ({ tiles: [/* … */], tables: [/* … */], funnel: { label: 'Requests received', value: 12 } }),
  // Requests recorded after a visit from YouTube (link with `utm_source=youtube`):
  sourceRequests: async (from, to, source) => ({ total: 3, bySubject: [] }),
});
```

Labels given by the site (page names, goals, groups, extras) are the site's own data: give them in the language of the site, or build the kit per language.

## Theme

The site sets the variables it wants, on any ancestor of the components (or on their tag). Dark mode is enabled by the `theme="dark"` input (or `auto`, which follows the system), or by `data-sk-mode="dark"` on an ancestor. A variable set by the site applies in both modes: give it its dark value under the site's dark selector.

```css
sk-statistics, sk-search-console, sk-youtube {
  --sk-brand: #1d3c9c;     /* buttons, links, focus */
  --sk-chart-1: #1d3c9c;   /* bars */
  --sk-chart-2: #c2410c;   /* line */
  --sk-radius: 10px;
  --sk-font: inherit;
  --sk-weight-strong: 600; /* lighter type scale */
}
html.dark sk-statistics { --sk-brand: #9ab6ff; --sk-chart-1: #7d9ef7; }
```

Available variables: `--sk-card`, `--sk-bg`, `--sk-ink`, `--sk-ink-2`, `--sk-muted`, `--sk-line`, `--sk-line-strong`, `--sk-brand`, `--sk-on-brand`, `--sk-chart-1`, `--sk-chart-1-hover`, `--sk-chart-2`, `--sk-chart-3`, `--sk-up`, `--sk-up-soft`, `--sk-down`, `--sk-down-soft`, `--sk-warn`, `--sk-warn-soft`, `--sk-hover`, `--sk-bar-track`, `--sk-input`, `--sk-badge`, `--sk-map-sea`, `--sk-map-land`, `--sk-map-border`, `--sk-map-lo`, `--sk-map-hi`, `--sk-shadow`, `--sk-radius`, `--sk-gap`, `--sk-font`. The defaults meet AA contrast; when changing them, the site is in charge of that contrast.

Type and shape, for a host with its own scale (for example Fluent 2: 600 at most, regular labels, 4 px controls): `--sk-weight-strong` (headings, figures, table heads, deltas; default 700), `--sk-weight-label` (tile labels, legends, badges, map tooltip; default 600), `--sk-weight-control` (buttons, period buttons, section links, "Show all"; default 600), `--sk-weight-row` (labels of the table rows; default 500), `--sk-radius-control` (buttons, period buttons, fields, CSV button, map zoom; default 8 px, 6 px for the small buttons).

The e-mail report has its own theme: `report.theme = { brand, head, ink, muted…, font, display, logo: { png | url, width, alt } }`; only `brand` is required.

### Narrow screens and enlarged text

The components have no fixed width: they fill the width they are given, from 320 px up, also with the text enlarged to 200 % (text size setting of a phone). Long words break, figures and labels go to the line instead of being cut, inner padding is capped in pixels so that it does not grow with the text, tiles go from four to two to one per row, and only the tables of figures scroll sideways, inside their card. At 760 px and below every control (period buttons, CSV, filter, sorting, links of the tables, map zoom) is a 48 × 48 px tap target. The end-to-end tests check it on every page, in both themes, at 320 to 1920 px and at 320 and 375 px with the text at 200 % (`e2e/layout.spec.ts`).

All component classes start with `sk-` and their styles are encapsulated: the site's global styles (`svg { … }`, `.bar`, `.card`…) do not reach them, and vice versa.

## Upgrading from 0.1.x

Version 0.2.0 renames everything that was in French. The former names keep working for one release (0.2.x) and will be removed in 0.3.0.

| 0.1.x | 0.2.0 | Former name in 0.2.x |
|---|---|---|
| `stats-kit/serveur` | `stats-kit/server` | deprecated alias |
| `stats-kit/contrat` | `stats-kit/contract` | deprecated alias |
| `stats-kit/contrat/schema.json` | `stats-kit/contract/schema.json` | deprecated alias |
| `stats-kit/serveur/monde.json` | `stats-kit/server/world.json` | deprecated alias |
| `<sk-statistiques>`, `SkStatistiques` | `<sk-statistics>`, `SkStatistics` | deprecated alias |
| `textes(langue, overrides, base)` | `createTexts(locale, overrides, base)` | deprecated alias (still French by default) |
| `LANGUES`, `Langue` | `LOCALES`, `Locale` | deprecated alias |
| `CENTROIDES` | `CENTROIDS` | deprecated alias |

Behaviour changes to check:

1. **Default language is now English** (it was French), on the server and in the components. To keep French, pass `locale: 'fr'` to `createStatsKit` and to `provideStatsKit`. Without `locale`, the components now follow the application's `LOCALE_ID`.
2. **Formats follow the locale** through Intl: hours read "09:00" (no longer "9 h"), durations "2 min 5 s", percentages and their spacing come from the locale, CSV exports use "," in English.
3. **Weekday names come from Intl**: the `weekdays` and `weekdaysShort` texts are gone; remove them from your overrides.
4. **Renamed or new texts** (only if you override them): `stats.csvName`, `search.csvName` and `youtube.csvName` become `csvFile` templates (`'statistics-{days}-days-{date}'`); `stats.bestDay` now has `{d}` and `{n}`; `stats.bestSlot`, `stats.heatCell` and `report.slot` receive a formatted `{hour}`; new: `common.labelValue`, `common.points`, `periods.short`, `stats.mapSummary`, `stats.mapCountry`, `youtube.colDate`, `youtube.colLost`.
5. **`formatDuration(texts, seconds)`** now takes the texts first, like the other formats; `gap(…, unit)` takes `'points'`, `'seconds'` or `null` instead of a raw suffix.
6. **Report**: the map attachment is now `cid:stats-kit-map` / `map.png` (was `stats-kit-carte` / `carte.png`), and `<html lang>` carries the full tag.
7. **Error messages for developers** (`error` fields of the responses, logs) are in English.

Then install the new tag: `npm i github:manueldelarque/stats-kit#v0.2.8`. Details: [CHANGELOG.md](CHANGELOG.md).

## Development

```sh
npm install          # dependencies, then build of the packages
npm test             # server and contract: Vitest, coverage (100 % of lines)
npm run test:angular # components: Vitest in Angular, coverage (100 % of lines)
npm run e2e          # demo built, then Playwright (installed Chrome), accessibility and layout included
npm run demo:build && npm run demo   # demo on http://localhost:5317, fake data
npm run screenshots  # screenshots of the demo in screenshots/
npm run report:previews -- <dir> en,fr  # the e-mail report on the fake data: computer and phone, light and dark
npm run schema       # regenerates the JSON schema from the types
npm run examples     # regenerates the example responses (packages/contract/examples)
npm run release      # builds and pushes the v<version> tag with the built packages
npm run dotnet:data  # regenerates the texts and the Intl snapshot of the .NET server
npm run dotnet:golden # regenerates the contract fixtures of the .NET server (answers of the Node server)
cd packages/dotnet && dotnet test --project test/StatsKit.Server.Tests   # .NET server: unit and contract tests
```

The .NET data and fixtures depend on the ICU data of Node: they are generated with Node 26 (as in CI).

The demo (`demo/`) plays the part of a site: it has its own global styles, including deliberately hostile rules, and serves as the ground for the end-to-end tests. Its language menu switches between the shipped languages. The fake services (`demo/fake/services.ts`) imitate Umami, Search Console and YouTube with fictitious, deterministic traffic; nothing leaves the machine.

The tests also render the pages and the report with a pseudo-locale (every text replaced by a symbol, Chinese formats): any Latin letter left in the output is a text written in the code instead of the locale files, and fails the build.

Migrating existing sites: [docs/MIGRATION.md](docs/MIGRATION.md).

## Licence

MIT, see [LICENSE](LICENSE). Base map: Natural Earth (public domain).
