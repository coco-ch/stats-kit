# Migrating an existing site to stats-kit

stats-kit gathers what had been copied from site to site: connectors, aggregations, administration pages and weekly report. This guide describes, for each kind of site, how to move to the library **without losing any feature**. Sites are described generically.

To upgrade a site that already uses stats-kit 0.1.x, see "Upgrading from 0.1.x" in the [README](../README.md#upgrading-from-01x).

Common principle:

1. install the library (`npm i <repository>#vX.Y.Z`, see the README);
2. on the server, replace the home-made modules (Umami, Search Console, YouTube, report, e-mail kit, PNG map) by **a single** `createStatsKit(…)` mounted behind the administration's authentication;
3. in Angular, replace the home-made screens by `<sk-statistics>`, `<sk-search-console>` and `<sk-youtube>`;
4. move the site's settings (labels, groups, goals, database data, texts, colours, language) into the configuration;
5. delete the copies: server modules, components, `world-110m.json` from the public folder, Leaflet and its settings (`allowedCommonJsDependencies`, stylesheet), tests that became useless;
6. keep the site's end-to-end tests on its own pages (they check the integration), adapting them to the new `sk-*` classes.

Environment variables keep their names (`UMAMI_*`, `GSC_*`, `YOUTUBE_*`): `sourcesFromEnv()` reads them as they are.

## General mapping

| Before (home-made copy) | With stats-kit |
|---|---|
| `server/umami.ts` (sign-in, `collect`, `analytics`, `group`, `heatmap`, `pageRows`, `resolveRange`, 2 min cache) | `createStatsKit({ umami })`, routes `/overview` and `/live`; `pages.languages` to group by language |
| `server/gsc.ts` (service account JWT, OAuth, `performance`, `sitemaps`, `indexation`) | `createStatsKit({ gsc })`, routes `/search` and `/search/indexation`; `gsc.indexationFilter` to check only part of the sitemap |
| `server/youtube.ts` (channel, videos, 180 days, traffic sources, visits from YouTube) | `createStatsKit({ youtube })`, route `/youtube`; `youtube.videoLabel` and `youtube.extraVideoIds` to link videos to the site's content; `sourceRequests` for the requests following a visit |
| `server/report.ts`, `email-kit.ts`, `worldmap.ts` | `stats.report()`, `stats.sendReport()`, route `/report/preview`; `report.send` = the site's existing sending function; `startWeeklyReport` for scheduling |
| Page and event labels (`PAGE_LABELS`, `EVENT_LABELS`…) | `pages.labels`, `events.labels` |
| Product pages, areas, articles counted separately | `pages.groups` (one pattern per group, optional labels) |
| "Call", "quote", "form sent" events added up | `goals` |
| Requests received, to handle, call-backs (site database) | `extras`: tiles (highlighted with `highlight`), tables (by subject, by language), last funnel step |
| Report texts editable in the administration (subject, title, introduction, footer) | `texts.report.subject`, `title`, `intro`, `footer`, read again at every sending (pass a function that recreates the kit, or texts read from the database at start-up); variables `{site}`, `{from}`, `{to}`, `{period}`, `{days}` |
| Language of the screens and of the report | `locale` (`en`, `fr`, `de`, `es`, `it`, `pt`, `nl`, or a regional tag); in Angular, the application's `LOCALE_ID` by default |
| Report and map colours | `report.theme.brand` (the rest derives from it), logo through `report.theme.logo` |
| `stats-kit.ts` / `admin/stats.ts` / `admin/google.ts` / `admin/youtube.ts` / `world-map.ts` | components of `stats-kit/angular` |
| CSS variables `--adm-*` | `--sk-*` variables (see the README); the site can link them: `--sk-brand: var(--adm-brand)` |

## Node + Angular site, most complete Node version (Umami, Search Console, YouTube, report, requests)

This is the copy closest to the library: the migration is mostly plugging in.

Server:

```ts
const stats = createStatsKit({
  siteName: SITE_NAME, timeZone: 'Europe/Paris', locale: SITE_LANGUAGE, ...sourcesFromEnv(),
  pages: { languages: SITE_LANGUAGES, labels: PAGE_LABELS, groups: [
    { id: 'products', title: 'Most viewed products', pattern: /^\/products\/([a-z0-9-]+)$/, labels: (k) => dictionary[`products.${k}.name`] },
    { id: 'areas', title: 'Most viewed areas', pattern: /^\/areas\/([a-z0-9-]+)$/, labels: AREA_LABELS },
    { id: 'articles', title: 'Most read articles', pattern: /^\/articles\/([a-z0-9-]+)$/ },
  ] },
  events: { labels: EVENT_LABELS },
  goals: [{ id: 'calls', label: 'Clicks to call', events: CALL_EVENTS }, { id: 'quotes', label: 'Quote clicks', events: QUOTE_EVENTS }, { id: 'forms', label: 'Forms sent', events: ['form-sent'] }],
  extras: async (range) => siteRequests(range),            // "Requests received", "To handle", "Call-backs" tiles, tables by subject and by language
  sourceRequests: (from, to, source) => requestsFrom(source, from, to),
  youtube: youtubeFromEnv() && { ...youtubeFromEnv()!, channelUrl: CHANNEL_ADDRESS, videoLabel: (v) => filmOfVideo(v.id), extraVideoIds: olderVersions },
  gsc: gscFromEnv() && { ...gscFromEnv()!, sitemapUrl: `${PUBLIC_URL}/sitemap.xml`, indexationFilter: (u) => u.includes('/en'), brandTerms: ['site-name'] },
  report: { theme: { brand: COLOUR }, statsUrl: `${PUBLIC_URL}/admin/stats`, send: (m) => sendMail({ to: recipients(), ...m }) },
});
app.use('/api/admin/audience', requireAdmin, stats.middleware());
startWeeklyReport({ schedule: { weekday: 1, hour: 8, timeZone: 'Europe/Paris' }, getLastSent: () => privateGet('report.lastSent'), setLastSent: (w) => privateSet('report.lastSent', w), send: async () => (await stats.sendReport({ days: 7 }, true)).ok });
```

- Keep the report settings screen (enabled, recipients, texts): it feeds `report.send` (recipients) and the texts. The "enabled" switch becomes a `send` that returns `false` without doing anything, or stopping `startWeeklyReport`.
- The existing sending function accepts an inline attachment: pass `m.attachments` (map, logo).
- The "do not count this browser" setting (team visits) stays in the site: show it above `<sk-statistics>`.
- Dashboard and other screens that read `/api/admin/stats`: read `/api/admin/audience/overview` (same information, contract shape).
- End-to-end tests: the site's fake Umami can stay; the selectors `.kpi`, `.top`, `.geo`, `.heat .cell`, `table.sessions` become `sk-tile`, `sk-metric-table`, `sk-world-map`, `.sk-heat__cell`, `.sk-sessions table`.

Gaps to know (not taken over, keep them in the site if needed):

- the "last 7 days" column of the actions table (series per event);
- the "Where do we stand this week?" card of the Google screen;
- the state of automatic video publishing (publishing file): only the video → content link is taken over (`videoLabel`, `extraVideoIds`).

## Node + Angular site, older copy (Umami and Search Console, conversion tracking)

- Same plugging as above, without YouTube or `extras` if there is no requests database.
- Conversion indicators (clicks to e-mail, to a professional network, form sent) become `goals`.
- The "last 7 days against the 7 before" block is covered by the tiles (change against the previous period) and, on the Google screen, by the "last 7 days" tiles.
- The embedded Search Console screen gains opportunities, appearance and indexing.

## .NET + Angular site (reference version: map, live count, 24 h, heatmap, illustrated report, 11 languages)

The server stays in .NET. Since the `StatsKit.Server` package, the simplest path is to replace the site's statistics code by it: `AddStatsKit` + `MapStatsKit` at the current address, the site's mail sending in `Report.Send`, its cost figures in `Extras` (page) and `Report.Blocks` (report), the weekly sending by `WeeklyReportService`. The steps below describe the former path (keeping its own code and only changing the contract).

1. **Controller**: at the current address (already without "analytics" in the path), return `StatsOverview` instead of the home-made overview. The field-by-field mapping is in [CONTRACT.md](CONTRACT.md#writing-a-compatible-server-in-net); to complete: `range`, `series.slots` in local time, `previousPageviews` (series of the previous period), `breakdowns.channels`, `regions`, `hostnames`, `utm*` (same `metrics` call with other `type`s), `pages` (Umami `metrics/expanded`), `goals`, `counts`, `extras`. Add `GET …/live`. Serve `world-110m.json` (already in the project) as `GET …/world.json`, or pass `worldUrl` to the component.
2. **Report**: keep the existing C# report (already in tables, PNG map drawn on the server, preview) behind `GET …/report/preview` and `POST …/report/send`, returning `ReportPreview` and `ReportSendResult`. The "costs" block (AI service usage, subscriptions) stays specific to the site; in the page, expose it as `extras` (tiles and a "by provider" table).
3. **Angular**: replace the analytics component by `<sk-statistics [locale]="activeLanguage()" [texts]="siteTexts()" />`; calls go through `HttpClient`, the site's JWT interceptor applies. Remove Leaflet and the copy of the centroids.
4. **Languages**: the library ships eleven languages (English, French, German, Spanish, Italian, Portuguese, Dutch, Russian, Chinese, Japanese, Korean). For another language of the site, build `baseTexts` from its existing translation files (same shape as `LOCALES.en`) and pass it to `provideStatsKit` with the matching `locale`; a language worth sharing can be added to the library itself (see "Languages" in the README).
5. **Refresh**: the site refreshed the whole page every 15 seconds; the library refreshes the live count every 30 seconds and the rest every 2 minutes (`liveMs`, `refreshMs` to get the former rhythm back).

Gaps to know: the traffic peak alert (a message sent when the past hour exceeds the average) is not in the library; it stays in the site.

## Multi-source administration console (under construction)

- A console following several sites creates **one kit per site** (`createStatsKit` with the settings of each) and mounts them under one address per site (`/api/sites/:id/audience`); each page receives the `apiUrl` of the site shown.
- Its own sources (YouTube publishing, home-made report) plug in through `youtube.videoLabel` / `extraVideoIds`, `extras` and `report.send`.
- Still missing in the library: a site selector and a summary view of several sites side by side; a report gathering several sites.

## Checking that no feature is lost

For each site, before deleting the former page:

- compare, over the same period, the totals of the former and of the new page (visitors, visits, page views, bounce, duration);
- check the map, the 24 hours, the heatmap, the rankings, the sessions, the CSV export, printing;
- compare the report: preview, then a real sending to a test address, opened in Outlook and on a phone;
- check the Google and YouTube screens and their "not configured" states;
- check the pages and the report in each language the site uses;
- run the accessibility audit (axe) of the integrated page, light and dark.
