const v = (env, k) => env[k]?.trim() || undefined;
export function umamiFromEnv(env = process.env) {
    const url = v(env, 'UMAMI_API_URL'), websiteId = v(env, 'UMAMI_WEBSITE_ID');
    const apiKey = v(env, 'UMAMI_API_KEY'), username = v(env, 'UMAMI_USERNAME'), password = v(env, 'UMAMI_PASSWORD');
    if (!url || !websiteId || !(apiKey || (username && password)))
        return null;
    const dash = v(env, 'UMAMI_DASHBOARD_URL');
    return { url, websiteId, apiKey, username, password, ...(dash ? { dashboardUrl: dash === 'false' ? false : dash } : {}) };
}
export function gscFromEnv(env = process.env) {
    const property = v(env, 'GSC_SITE');
    const serviceAccount = v(env, 'GSC_SERVICE_ACCOUNT'), oauth = v(env, 'GSC_OAUTH');
    if (!property || !(serviceAccount || oauth))
        return null;
    return { property, serviceAccount, oauth, sitemapUrl: v(env, 'GSC_SITEMAP_URL'), apiUrl: v(env, 'GSC_API_URL'), inspectUrl: v(env, 'GSC_INSPECT_URL'), tokenUrl: v(env, 'GSC_TOKEN_URL') };
}
export function youtubeFromEnv(env = process.env) {
    const clientId = v(env, 'YOUTUBE_CLIENT_ID'), clientSecret = v(env, 'YOUTUBE_CLIENT_SECRET'), refreshToken = v(env, 'YOUTUBE_REFRESH_TOKEN');
    if (!clientId || !clientSecret || !refreshToken)
        return null;
    return {
        clientId, clientSecret, refreshToken, channelId: v(env, 'YOUTUBE_CHANNEL_ID'), channelUrl: v(env, 'YOUTUBE_CHANNEL_URL'),
        tokenUrl: v(env, 'YOUTUBE_TOKEN_URL'), apiUrl: v(env, 'YOUTUBE_API_URL'), analyticsUrl: v(env, 'YOUTUBE_ANALYTICS_URL'),
    };
}
/** The three sources at once: `createStatsKit({ siteName, ...sourcesFromEnv() })`. */
export const sourcesFromEnv = (env = process.env) => ({ umami: umamiFromEnv(env), gsc: gscFromEnv(env), youtube: youtubeFromEnv(env) });
