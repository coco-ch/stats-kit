/** Server side: Umami, Search Console and YouTube connectors, aggregations, e-mail report, HTTP routes. */
export { createStatsKit, type StatsKit, type StatsKitConfig, type ReportConfig, type KitRequest, type KitResponse, type NodeResponse } from './kit.ts';
export { umamiFromEnv, gscFromEnv, youtubeFromEnv, sourcesFromEnv } from './env.ts';
export { umamiClient, umamiConfigured, umamiDefaultAccount, parseStats, type UmamiClient, type UmamiConfig } from './umami.ts';
export { gscClient, gscConfigured, searchPeriod, signJwt, parseCredentials, type GscClient, type GscConfig, type ServiceKey, type OauthCredentials } from './gsc.ts';
export { youtubeClient, youtubeConfigured, isoSeconds, type YoutubeClient, type YoutubeConfig } from './youtube.ts';
export { buildOverview, emptyOverview, logicalPath, toItems, groupPaths, pageRows, heatmap, alignSeries, eventSeries, type EventPoint, type Labels, type PagesOptions, type OverviewOptions } from './overview.ts';
export { resolveRange, slotsBetween, slotOf, slotOfLabel, zonedToInstant, weekId, type RangeQuery } from './time.ts';
export { buildReport, previewHtml, MAP_CID, LOGO_CID, type ReportInput, type ReportMessage, type ReportBlock, type ReportVideo, type InlineAttachment } from './report/report.ts';
export { renderSparkline, renderCompare, SPARK_WIDTH, SPARK_HEIGHT } from './report/spark-png.ts';
export { renderWorldMap, encodePng, loadWorld } from './report/map-png.ts';
export { palette, type ReportTheme, type DarkColors } from './report/theme.ts';
export { reportDue, weeklyTick, startWeeklyReport, type WeeklySchedule, type WeeklyRunner } from './report/schedule.ts';
export { Cache, TokenHolder, SourceError, type Fetch } from './http.ts';
