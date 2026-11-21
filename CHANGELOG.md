# Changelog

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
