# Changelog

## 0.2.7

What an equipment-rental site's statistics page and weekly report had that the library did not, found while moving it to the library. Backward compatible: nothing to change to upgrade; the new contract fields are optional.

### Added

- **Statistics page**: "Last 7 days" column in the visitor actions table, for periods of more than 7 days counted by day. The overview gains `eventSeries` (occurrences of each event per slot of `series`, from Umami's `events/series`; `null` if Umami refuses it). A server that does not fill it simply has no column.
- **Site tiles**: optional `link` (`{ url, label }`) on `extras.tiles`, shown under the figure on the Statistics page (48 px tap target on a phone) and, for a highlighted tile, at the end of its line in the report ("3 requests to handle — Open the requests") and in the text version.
- **Report**: `report.texts`, a function read again at every report, for texts edited in the site's administration (subject, title, introduction, footer…) without recreating the kit; applied over `texts`, section by section. The pages keep the texts given at creation.
- **Report**: `report.searchUrl` and `report.youtubeUrl`, links at the end of the Google and YouTube blocks to the pages of the administration; "Countries (Google)" ranking next to the Google queries.
- **Report**: `theme.map` (`background`, `land`, `border`, `low`, `high`, "#rrggbb") sets the colours of the PNG world map; by default they still derive from `brand`.
- Texts in the eleven languages: `report.googleCountries`, `report.googleCountriesHint`, `report.googleLink`, `report.youtubeLink` (`stats.colLast7` and `stats.colLast7Tip` were already there).

### Changed

- **Site data**: `extras` is read at every overview instead of being kept with Umami's figures for the cache time (2 minutes): a request received a moment ago shows at once on the page and in a report sent right after.
- **YouTube**: the labels of the videos (`youtube.videoLabel`) are read at every answer instead of being kept with the channel data for an hour: a site that renames a film, or links a new video to it, sees it at once.

### .NET server

- Same as Node for the overview: `EventSeries` (Umami `events/series`), site data (`Extras`) read at every overview instead of being kept in the cache, optional `ExtraTile.Link` (left out of the JSON when null) shown at the end of a highlighted tile's line in the report.
- Still to take over on the .NET side (for the agent in charge of the .NET site): `theme.map` colours of the PNG map, `report.texts` read again at every report (today: options read at start-up), and, once Search Console and YouTube are connected there, the links to the Google and YouTube pages and the "Countries (Google)" ranking.

## 0.2.6

A .NET server, published as the NuGet package `StatsKit.Server`, and four more languages. Backward compatible: nothing changes for Node sites.

### Added

- **.NET server** (`packages/dotnet`, NuGet package `StatsKit.Server`, .NET 10 or later, ASP.NET Core, no dependency beyond the shared framework): Umami connector (service account or API key, token shared and renewed on a 401, "path" retried as "url" on Umami 2), cache, overview with the previous period, live count, last 24 hours, heatmap, rankings, goals, site data (`Extras`), e-mail report with the PNG world map, "At a glance" card, previous period day by day, site-specific cards (`Report.Blocks`), totals in the subject, its preview, weekly sending (`WeeklyReportService`), routes `MapStatsKit(prefix)` and `HandleAsync` without routing. Search Console and YouTube answer "not configured" for now. See the README, "Server side (ASP.NET Core)".
- **Contract tests between the two servers**: `npm run dotnet:golden` records what the Node server asks the simulated Umami and what it answers (overview over several periods, live count, report preview in every language, errors, unconfigured source); the .NET tests replay it and require the same JSON, the same report HTML and text, and the same map pixels. `npm run dotnet:data` generates the texts and a snapshot of Intl for the .NET server, so that it formats numbers, dates, units, country and language names exactly as Node, also in a container without globalization data. CI checks that both are up to date (job ".NET server").
- **NuGet publication**: for every version tag, the workflow `.github/workflows/dotnet-release.yml` tests, packs, attaches the `.nupkg` to the GitHub release of the tag, and publishes it on nuget.org when the repository has the `NUGET_API_KEY` secret (how to create it: README, "Publishing the NuGet package").
- **Languages**: Russian (`ru`), Chinese, simplified (`zh`), Japanese (`ja`) and Korean (`ko`), in the pages, the report and its preview, on both servers. Eleven languages in all.

### Fixed

- **Weekly report**: a missed report is caught up only during the first days of the week (`schedule.catchUpDays`, 3 by default: Monday to Wednesday for a Monday report). Before, a fresh install or a server started on a Sunday sent the current week's report at once, out of time. `catchUpDays: 7` restores the former behaviour. The .NET server applies the same rule (`WeeklySchedule.CatchUpDays`), checked by the contract tests.

## 0.2.5

What a site's own statistics page and report had that the library did not, found while moving a consulting firm's site to the library. Backward compatible: nothing to change to upgrade; the report gains two cards by default.

### Added

- **Statistics page**: "Recent days" tiles, visitors and page views of the last 7 days against the 7 days before, for periods of 14 days or more (the recent trend inside a 30 or 90-day period, as on the Google page).
- **Report**: "At a glance" card after the key figures (top traffic source, country, page and entry page, best day, busiest slot), also in the text version; `report.glance: false` removes it.
- **Report**: the page views per day show the previous period day by day next to each bar, lighter, with a legend (when the overview has `series.previousPageviews`).
- **Report**: site-specific cards (`report.blocks(overview)` → `ReportBlock[]`: title, hint, figures, lines), after the rankings and in the text version; a failure of the function is logged and the report leaves without them. Type `ReportBlock`. This was on the roadmap.
- **Report**: the totals are available as variables of the subject, title, introduction and footer: `{visitors}`, `{visits}`, `{pageviews}`, `{change}` (change of visitors against the previous period); empty brackets left by a missing `{change}` are removed from the subject.
- Texts in the seven languages: `stats.groupRecent`, `stats.last7Visitors`, `stats.last7Pageviews`, `stats.vsPrevious7`, `report.glanceTitle`, `report.glanceSource`, `report.glanceCountry`, `report.glancePage`, `report.glanceEntry`, `report.glanceSlot`, `report.dailyCurrent`, `report.dailyPrevious`.

### For servers written in another language (the .NET reference report)

The report is built by the Node server; a site that keeps its own report (the .NET version described in docs/MIGRATION.md) should add the same parts to stay level: the "At a glance" card (top source, country, page, entry page, best day, busiest slot), the previous period day by day next to each bar of the page views per day with its legend, site-specific cards after the rankings, and the totals in the subject. Texts: the `report.glance*` and `report.daily*` keys above. The contract is unchanged.

## 0.2.4

Font weights and control radii become public variables, for a host with a lighter type scale (an administration console styled after Fluent 2 / Microsoft 365). Backward compatible: the defaults are unchanged.

### Added

- `--sk-weight-strong` (headings, figures, table heads, deltas; 700), `--sk-weight-label` (tile labels, legends, badges, map tooltip; 600), `--sk-weight-control` (buttons, period buttons, section links, "Show all"; 600), `--sk-weight-row` (labels of the table rows; 500).
- `--sk-radius-control`: corner radius of buttons, period buttons, date fields, CSV button, table filter and map zoom buttons (8 px by default, 6 px for the small buttons).

## 0.2.3

Follow-up of 0.2.2, found by its own layout check on the end-to-end runners (Linux, whose default fonts are wider). Backward compatible.

### Fixed

- **Tiles**: a long figure ("1 min 36 secs") still overflowed its tile between 768 and 1440 px with wider fonts; it now goes to the line between its words at every width.
- **Buttons**: in German with enlarged text, a single long word ("Berichtsvorschau") made a button wider than a 320 px screen and the whole page scrolled sideways. Buttons and period buttons stay within their container and may break inside a word; their side padding is capped in pixels.
- **Heatmap**: with enlarged text on a phone, the hour labels collided; below a width of 15rem (a threshold that grows with the text) only every sixth hour is labelled.

### Changed

- The layout check (`e2e/layout.spec.ts`) runs in a wide font (Verdana, DejaVu Sans), so that it is as strict on Windows and macOS as on Linux.

## 0.2.2

Layout fixes found with the text enlarged to 200 % on a phone, in an administration console that embeds the three pages. Backward compatible: nothing to change to upgrade; hosts that patched these points in their own styles can drop those rules.

### Fixed

- **Tiles**: with enlarged text, labels and figures overflowed their tile and covered the next one. A tile now has a single fluid column, long words break, the figure may go to the line on a phone, and tiles go from two to one per row when two no longer fit (`minmax(min(9rem, 100%), 1fr)` instead of a fixed two-column grid).
- **Ranking tables**: the head (title, filter, CSV) no longer pushes the filter and the button out of the card: it wraps, and the filter shrinks to the width available. Row labels go to the line instead of being cut with an ellipsis (the full text is visible; long labels make a row taller on a desktop too). The label column has a minimum width of `min(8.5rem, 40vw)` instead of `8.5rem`.
- **Statistics page**: funnel labels and figures no longer overlap; the latest sessions (cards on a phone) no longer leave the window; the map legend and the live badge wrap.
- **Inner padding** of cards, tiles, tables and charts is capped in pixels (`min(1rem, 16px)`…): the same as before at the default text size, it no longer doubles with enlarged text.
- **Headings, leads, notes, status messages**: long words break (`overflow-wrap: anywhere`) instead of leaving the card.
- **Tap targets**: 48 × 48 px (was 44 px) at 760 px and below (was 700 px) for every control: period buttons, buttons, date fields, CSV button, filter, sort buttons, "Show all", links of the table rows, section links, pause button, map zoom buttons (side by side on a phone).

### Added

- End-to-end layout check (`e2e/layout.spec.ts`, `e2e/layout.ts`): each page in both themes at 320, 375, 412, 768, 1024, 1366, 1440 and 1920 px, then at 320 and 375 px with the text at 200 %, in English and German: no horizontal scrolling, nothing out of the window or of its card, no overlap, no cut text, 48 px tap targets at phone widths.
- The map zoom end-to-end test waits for the view to be redrawn after a click (it read it too early and failed intermittently).

## 0.2.1

Fixes found while plugging the library into a multi-site administration console. Backward compatible: nothing to change to upgrade.

### Fixed

- **World map**: the base map was read under the `apiUrl` of `provideStatsKit`, even when the page had its own `apiUrl` input, so the map stayed empty without an explicit `worldUrl`. It is now read at `{apiUrl}/world.json` with the address of the page that shows it; `sk-world-map` takes an `apiUrl` input. New `worldUrl` option of `provideStatsKit`. A relative `apiUrl` (without a leading slash) is resolved against `<base href>`, so an administration served under a sub-path works without any setting.
- **Changing the source address**: `<sk-statistics>`, `<sk-search-console>` and `<sk-youtube>` reload their data when their `apiUrl` input changes (site selector) instead of having to be recreated; the period is kept, a late answer of the previous source is ignored.
- **Errors kept in cache**: an overview in error (Umami unreachable, sign-in refused) stayed in the server cache for its time to live (2 minutes), and a YouTube answer with YouTube Analytics refused for an hour. They are no longer kept: the next call reads the source again. `Cache.get(key, ttl, load, keep?)` takes an optional predicate for that.

### Added

- `heading` input on the three pages (`h1` by default, `h2`, or `none` to hide the title and the lead when the host page has its own), and `heading` option of `provideStatsKit`. Type `HeadingLevel`.
- Umami: warning at start-up, without any secret, when the connector uses the default account of a new Umami; `umamiDefaultAccount()`; README section "Securing a new Umami" (the library does not change the password itself, the section says why).
- Demo: two sites with a site selector, `?heading=` parameter, `DEMO_BASE` to serve it under a sub-path; end-to-end tests under `/console/`.

### Not in this release (roadmap)

- Selector of several sites inside the components (today: one `apiUrl` per site, bound to the host's selector).
- Configurable funnel (steps chosen by the site: pages, events).
- YouTube connector with an API key only (public figures, without the owner's OAuth authorisation).
- Site-specific blocks in the e-mail report (done in 0.2.5).


## 0.2.0

The repository is now entirely in English, and the labels are available in several languages.

### Added

- Labels in English (default and fallback), French, German, Spanish, Italian, Portuguese (Portugal) and Dutch, in the Angular pages, the e-mail report, its preview and the map.
- `locale` option on `createStatsKit`, `provideStatsKit` and every page; regional tags (`fr-CH`, `en-US`) keep the texts of the language and format numbers and dates the regional way; the components follow the application's `LOCALE_ID` when no locale is given.
- Numbers, percentages, durations, dates, weekdays, hours, country and language names formatted with Intl; plural forms with `Intl.PluralRules`; CSV separator chosen from the locale.
- New contract exports: `createTexts`, `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `matchLocale`, `labelValue`, `weekdayName`, `hourName`, `shortDateTime`, `csvSeparator`, `CENTROIDS`.
- Tests: every locale has exactly the same keys and variables as English; the pages and the report are rendered with a pseudo-locale to prove that no text is written in the code.

### Changed

- Entry points renamed: `stats-kit/server` (was `serveur`), `stats-kit/contract` (was `contrat`), `stats-kit/contract/schema.json`, `stats-kit/server/world.json` (was `serveur/monde.json`); folders `packages/server` and `packages/contract`.
- `SkStatistics` / `<sk-statistics>` (was `SkStatistiques` / `<sk-statistiques>`).
- Default language: English (was French).
- `formatDuration(texts, seconds)` takes the texts first; `gap()` takes a unit (`'points'`, `'seconds'` or `null`).
- Texts: `weekdays` and `weekdaysShort` removed (Intl); `csvName` replaced by `csvFile` templates; `stats.bestDay`, `stats.bestSlot`, `stats.heatCell` and `report.slot` take formatted values; new texts `common.labelValue`, `common.points`, `periods.short`, `stats.mapSummary`, `stats.mapCountry`, `youtube.colDate`, `youtube.colLost`.
- Report map attachment: `cid:stats-kit-map`, `map.png`.
- Developer-facing error messages, comments, documentation, demo, tests and workflows in English.

### Deprecated (removed in 0.3.0)

`stats-kit/serveur`, `stats-kit/contrat`, `stats-kit/contrat/schema.json`, `stats-kit/serveur/monde.json`, `<sk-statistiques>`, `SkStatistiques`, `textes()` (French by default, as before), `LANGUES`, `Langue`, `CENTROIDES`.

See "Upgrading from 0.1.x" in the [README](README.md#upgrading-from-01x).

## 0.1.1

- Angular entry point: path of the type declarations fixed.

## 0.1.0

- First version: Umami, Search Console and YouTube connectors, weekly e-mail report, Angular pages, data contract.
