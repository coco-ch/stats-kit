/** Côté serveur : connecteurs Umami, Search Console et YouTube, agrégations, rapport par e-mail, routes HTTP. */
export { createStatsKit, type StatsKit, type StatsKitConfig, type ReportConfig, type KitRequest, type KitResponse, type NodeResponse } from './kit.ts';
export { umamiFromEnv, gscFromEnv, youtubeFromEnv, sourcesFromEnv } from './env.ts';
export { umamiClient, umamiConfigured, parseStats, type UmamiClient, type UmamiConfig } from './umami.ts';
export { gscClient, gscConfigured, searchPeriod, signJwt, parseCredentials, type GscClient, type GscConfig, type ServiceKey, type OauthCredentials } from './gsc.ts';
export { youtubeClient, youtubeConfigured, isoSeconds, type YoutubeClient, type YoutubeConfig } from './youtube.ts';
export { buildOverview, emptyOverview, logicalPath, toItems, groupPaths, pageRows, heatmap, alignSeries, type Labels, type PagesOptions, type OverviewOptions } from './apercu.ts';
export { resolveRange, slotsBetween, slotOf, slotOfLabel, zonedToInstant, weekId, type RangeQuery } from './temps.ts';
export { buildReport, previewHtml, MAP_CID, LOGO_CID, type ReportInput, type ReportMessage, type InlineAttachment } from './rapport/rapport.ts';
export { renderWorldMap, encodePng, loadWorld } from './rapport/carte-png.ts';
export { palette, type ReportTheme } from './rapport/theme.ts';
export { reportDue, weeklyTick, startWeeklyReport, type WeeklySchedule, type WeeklyRunner } from './rapport/planification.ts';
export { Cache, TokenHolder, SourceError, type Fetch } from './http.ts';
