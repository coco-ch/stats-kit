/** Côté serveur : connecteurs Umami, Search Console et YouTube, agrégations, rapport par e-mail, routes HTTP. */
export { createStatsKit } from "./kit.js";
export { umamiFromEnv, gscFromEnv, youtubeFromEnv, sourcesFromEnv } from "./env.js";
export { umamiClient, umamiConfigured, parseStats } from "./umami.js";
export { gscClient, gscConfigured, searchPeriod, signJwt, parseCredentials } from "./gsc.js";
export { youtubeClient, youtubeConfigured, isoSeconds } from "./youtube.js";
export { buildOverview, emptyOverview, logicalPath, toItems, groupPaths, pageRows, heatmap, alignSeries } from "./apercu.js";
export { resolveRange, slotsBetween, slotOf, slotOfLabel, zonedToInstant, weekId } from "./temps.js";
export { buildReport, previewHtml, MAP_CID, LOGO_CID } from "./rapport/rapport.js";
export { renderWorldMap, encodePng, loadWorld } from "./rapport/carte-png.js";
export { palette } from "./rapport/theme.js";
export { reportDue, weeklyTick, startWeeklyReport } from "./rapport/planification.js";
export { Cache, TokenHolder, SourceError } from "./http.js";
