# Changelog

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
- Site-specific blocks in the e-mail report.


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
