# Data contract (version 1)

This document describes the JSON responses exchanged between the server and the components. It lets you write a server in another language (.NET, PHP…) that feeds the Angular components without any change.

- Single source: the TypeScript types of [`packages/contract/src/types.ts`](../packages/contract/src/types.ts).
- JSON schema generated from these types: [`packages/contract/schema/contract.schema.json`](../packages/contract/schema/contract.schema.json) (one definition per response: `StatsOverview`, `LiveResponse`, `SearchOverview`, `IndexationResponse`, `YoutubeOverview`, `ReportPreview`, `ReportSendResult`). CI checks it is up to date.
- Complete examples, validated against the schema by every test run: [`packages/contract/examples/`](../packages/contract/examples/).

The responses carry no display text: labels, numbers and dates are formatted by the components in the reader's language. A server only gives codes, keys and figures (and the labels chosen by the site).

## Conventions

| Topic | Rule |
|---|---|
| Version | every response carries `"version": 1`; it changes with every incompatible change. An added field does not change the version. |
| Names | camelCase, in English (Umami vocabulary: `pageviews`, `visitors`, `visits`, `bounces`, `totaltime`). |
| Instants | ISO 8601 strings in UTC: `"2026-11-16T08:00:00.000Z"`. |
| Days | `"YYYY-MM-DD"`. |
| Series slots | `"YYYY-MM-DD"` (day) or `"YYYY-MM-DDTHH"` (hour), **in the time zone of the period** (`range.timeZone`); the components show them without conversion. |
| Series | continuous: one slot per day or hour of the period, zero when the source has nothing. Value arrays have the length of `slots`. |
| Durations, rates | seconds; rates from 0 to 1 (except `averageViewPercentage`, from 0 to 100 as YouTube gives it). |
| Unknown values | `null`, never a missing field; empty lists: `[]`. |
| State of a source | `status`: `ok`, `not-configured` (no settings: nothing is called) or `error` (the source did not answer; `error` gives a short message for developers, in English). The response always keeps the same shape, figures at zero. |
| HTTP errors | reserved for failures of the server itself (500) and for sending the report (503: sending not set up, 502: sending failed). A missing or failing source answers 200 with `status`. |
| Labels | `label` is given when the site chose a name ("Home" for `/`); otherwise `null` and the components compute a label from `key` (name of the country, language, device, browser, channel, in the reader's language). |

## Routes

All relative to the mount point chosen by the site (for example `/api/admin/audience`; avoid "analytics", "stats", "track", which ad blockers block).

| Method and path | Parameters | Response |
|---|---|---|
| `GET /overview` | `days` (1 to 366, 30 by default; 1 = 24 hours, by hour) or `from`, `to` (`YYYY-MM-DD`, days included, in the time zone) | `StatsOverview` |
| `GET /live` | — | `LiveResponse` |
| `GET /search` | `days` (1 to 480, 28 by default) or `from`, `to` | `SearchOverview` |
| `GET /search/indexation` | — | `IndexationResponse` |
| `GET /youtube` | `days` (1 to 90, 28 by default) | `YoutubeOverview` |
| `GET /report/preview` | as `/overview` (7 days by default) | `ReportPreview` |
| `POST /report/send` | as `/overview` | `ReportSendResult` |
| `GET /world.json` | — | GeoJSON base map (Natural Earth 1:110m, each country carries `properties.iso2`) |

A third-party server can serve the base map from [`packages/server/assets/world-110m.json`](../packages/server/assets/world-110m.json), or give the components another address (`worldUrl`).

## `StatsOverview` — Statistics page

| Field | Type | Content |
|---|---|---|
| `version`, `status`, `error`, `generatedAt` | | see conventions |
| `range` | `Range` | `from`, `to` (end excluded), `days`, `unit` (`hour` for 24 hours, `day` otherwise), `timeZone`, `previousFrom`, `previousTo` (previous period of the same length, ending where the period starts) |
| `totals` | `Totals` | `pageviews`, `visitors`, `visits`, `bounces` (single-page visits), `totaltime` (cumulated seconds) |
| `previous` | `Totals` or `null` | the same totals over the previous period |
| `active` | number or `null` | visitors active right now (last 5 minutes) |
| `series` | `Series` | `unit`, `slots`, `pageviews[]`, `visitors[]`, `previousPageviews[]` (aligned slot by slot) or `null` |
| `last24h` | `Series` | last 24 hours, by hour, whatever the period |
| `heatmap` | 7 × 24 numbers | page views by weekday (Monday = 0) and hour, in the time zone |
| `breakdowns` | `Breakdowns` | rankings sorted by decreasing value, each a list of `Item`: `pages`, `entries`, `exits`, `referrers` (empty key = direct access), `channels`, `countries` (ISO alpha-2), `regions` ("FR-PAC"), `cities`, `languages` (browser), `siteLanguages` (path prefix), `devices`, `browsers`, `os`, `screens`, `events`, `hostnames`, `utmSources`, `utmMediums`, `utmCampaigns` |
| `pages` | `PageRow[]` | detail by page: `key`, `label`, `views`, `visitors`, `entries`, `exits`, `bounces`, `totaltime`, `previousViews`; empty if the source does not provide it (the components fall back to `breakdowns.pages`) |
| `groups` | `ItemGroup[]` | groups defined by the site: `id`, `title`, `items` |
| `goals` | `Goal[]` | goals: `id`, `label`, `value`, `previous` |
| `counts` | | `countries`, `events`: distinct numbers over the period, or `null` |
| `sessions` | `Session[]` | recent visits: `country`, `city`, `device`, `browser`, `os`, `views`, `lastAt` |
| `extras` | `Extras` or `null` | site's own data: `tiles` (`id`, `label`, `value` number or text, `previous`, `sub`, `group`, `highlight`), `tables` (`id`, `title`, `sub`, `head`, `column`, `section`: `pages`, `sources`, `audience` or `actions`, `items`), `funnel` (`{ label, value }`: last step of the funnel) |
| `dashboardUrl` | text or `null` | dashboard of the source ("Open Umami" button) |

`Item`: `{ key, label, value, previous }` — `previous` is `null` when the previous period is not requested for this ranking.

## `LiveResponse`

`{ version, active, at }` — `active` is `null` if the source does not answer.

## `SearchOverview` — Google page

| Field | Content |
|---|---|
| `property` | Search Console property ("sc-domain:example.org") |
| `serviceAccount` | address of the service account to add to the property (shown when Google refuses access), `null` with OAuth |
| `start`, `end`, `days`, `previousStart`, `previousEnd` | days included; the period ends two days before today (Google's publication delay) |
| `totals`, `previous` | `SearchTotals`: `clicks`, `impressions`, `ctr` (0 to 1), `position` (average, 0 without impressions) |
| `series`, `previousSeries` | `SearchDay[]`: `date` and the same measures |
| `queries`, `previousQueries`, `pages`, `previousPages`, `countries`, `previousCountries`, `devices`, `previousDevices`, `appearance` | `SearchRow[]`: `key` (query, full page address, ISO alpha-3 country in lower case, `DESKTOP`/`MOBILE`/`TABLET`, appearance type) and the measures |
| `queryPages` | `QueryPage[]`: `query`, `page` and the measures |
| `sitemaps` | `Sitemap[]` (`path`, `lastDownloaded`, `errors`, `warnings`, `pending`, `submitted`, `indexed`) or `null` |
| `brandTerms` | words of the site name (brand / non-brand split) |

The opportunities (high potential, rising, falling, new queries, rarely clicked pages, lost pages, cannibalisation) are computed by the components from these lists: a third-party server does not have to produce them (functions of [`analysis.ts`](../packages/contract/src/analysis.ts)).

## `IndexationResponse`

`{ version, status, error, checkedAt, total, indexed, pages: [{ url, verdict, state, lastCrawl, indexed }] }` — `status` is `not-configured` without a sitemap to read. `state` is Google's coverage text, in the language of the kit (`languageCode` of the Search Console settings, the kit locale by default).

## `YoutubeOverview` — YouTube page

| Field | Content |
|---|---|
| `channelUrl` | public channel, useful even without settings |
| `channel` | `id`, `title`, `handle`, `url`, `studioUrl`, `thumbnail`, `subscribers` (`null` if hidden), `views`, `videos`, `createdAt`; `null` without a channel |
| `videos` | most recent first: `id`, `url`, `title`, `label` (name given by the site), `publishedAt`, `duration` (s), `visibility`, `views`, `likes`, `comments`, `minutes`, `averageViewDuration`, `averageViewPercentage` |
| `days`, `start`, `end`, `totals`, `previous` | chosen period and the previous one: `views`, `minutes`, `gained`, `lost`, `averageViewDuration` |
| `series` | 180 days `{ date, views, minutes, gained, lost }`, up to yesterday |
| `traffic` | sources of the views over 28 days: `source` (YouTube type, `YT_SEARCH`…), `views`, `minutes` |
| `analyticsError` | message if YouTube Analytics refused (channel and videos are still shown) |
| `site` | what the channel brings to the site: `visits`, `visitors`, `previousVisits`, `referred`, `landing` (`Item[]`), `requests`, `previousRequests`, `requestsBySubject`; `null` if the site counts nothing |

## `ReportPreview` and `ReportSendResult`

- `ReportPreview`: `{ version, subject, html, text }` — `html` contains the images as `data:` (displayable outside a mail client). The report is written in the language of the kit (`locale` of `createStatsKit`).
- `ReportSendResult`: `{ version, ok, recipients, error }` — `error` is `send-not-configured` if the site did not provide a sending function.

## Writing a compatible server in .NET

The simplest is not to write it: the NuGet package `StatsKit.Server` ([README](../README.md#server-side-aspnet-core)) is that server, checked against the Node server by contract tests. The notes below remain for a site that keeps its own code.

- Serialise in camelCase and **write the `null`s**: `new JsonSerializerOptions(JsonSerializerDefaults.Web) { DefaultIgnoreCondition = JsonIgnoreCondition.Never }`.
- Slots are strings computed in the site's time zone (`TimeZoneInfo.ConvertTime`), not serialised `DateTime`s.
- `heatmap`: `int[7][24]`, Monday first (`((int)day.DayOfWeek + 6) % 7`).
- Fill the series with zeros for slots without data, and align `previousPageviews` on `slots`.
- Validate the responses against the schema in the tests (for example with `JsonSchema.Net`), from the examples provided.
- Mapping from an existing .NET overview of the "AnalyticsOverview" kind: `Summary` → `totals` (`TotalTimeSeconds` → `totaltime`), `Previous` → `previous`, `ActiveVisitors` → `active`, `Series` (by day) → `series` (`Date` → `slots`, `Pageviews` → `pageviews`, `Visits` → `visitors`), `Hourly` → `last24h`, `TopPages`… `TopEvents` → `breakdowns.*` (`Label` → `key`, `Count` → `value`), `RecentSessions` → `sessions`, `Heatmap` → `heatmap`, `DashboardUrl` → `dashboardUrl`, `Available = false` → `status: "not-configured"`.
- Do not translate anything on the server side for the pages: return codes and keys, the components display them in the reader's language.
