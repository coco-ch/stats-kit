/*
 * Réglages lus dans les variables d'environnement, avec les noms déjà utilisés par les sites :
 *   UMAMI_API_URL, UMAMI_USERNAME, UMAMI_PASSWORD, UMAMI_WEBSITE_ID (ou UMAMI_API_KEY pour Umami Cloud), UMAMI_DASHBOARD_URL ;
 *   GSC_SITE, GSC_SERVICE_ACCOUNT (JSON ou base64), GSC_OAUTH (JSON ou base64), GSC_SITEMAP_URL ;
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, YOUTUBE_CHANNEL_ID, YOUTUBE_CHANNEL_URL ;
 *   et, pour les tests de bout en bout (faux services locaux) : GSC_API_URL, GSC_INSPECT_URL, GSC_TOKEN_URL,
 *   YOUTUBE_TOKEN_URL, YOUTUBE_API_URL, YOUTUBE_ANALYTICS_URL.
 * Une source sans ses réglages vaut `null` : elle est alors annoncée « non configurée ».
 */
import type { GscConfig } from './gsc.ts';
import type { UmamiConfig } from './umami.ts';
import type { YoutubeConfig } from './youtube.ts';

type Env = Record<string, string | undefined>;
const v = (env: Env, k: string) => env[k]?.trim() || undefined;

export function umamiFromEnv(env: Env = process.env): UmamiConfig | null {
  const url = v(env, 'UMAMI_API_URL'), websiteId = v(env, 'UMAMI_WEBSITE_ID');
  const apiKey = v(env, 'UMAMI_API_KEY'), username = v(env, 'UMAMI_USERNAME'), password = v(env, 'UMAMI_PASSWORD');
  if (!url || !websiteId || !(apiKey || (username && password))) return null;
  const dash = v(env, 'UMAMI_DASHBOARD_URL');
  return { url, websiteId, apiKey, username, password, ...(dash ? { dashboardUrl: dash === 'false' ? false : dash } : {}) };
}

export function gscFromEnv(env: Env = process.env): GscConfig | null {
  const property = v(env, 'GSC_SITE');
  const serviceAccount = v(env, 'GSC_SERVICE_ACCOUNT'), oauth = v(env, 'GSC_OAUTH');
  if (!property || !(serviceAccount || oauth)) return null;
  return { property, serviceAccount, oauth, sitemapUrl: v(env, 'GSC_SITEMAP_URL'), apiUrl: v(env, 'GSC_API_URL'), inspectUrl: v(env, 'GSC_INSPECT_URL'), tokenUrl: v(env, 'GSC_TOKEN_URL') };
}

export function youtubeFromEnv(env: Env = process.env): YoutubeConfig | null {
  const clientId = v(env, 'YOUTUBE_CLIENT_ID'), clientSecret = v(env, 'YOUTUBE_CLIENT_SECRET'), refreshToken = v(env, 'YOUTUBE_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId, clientSecret, refreshToken, channelId: v(env, 'YOUTUBE_CHANNEL_ID'), channelUrl: v(env, 'YOUTUBE_CHANNEL_URL'),
    tokenUrl: v(env, 'YOUTUBE_TOKEN_URL'), apiUrl: v(env, 'YOUTUBE_API_URL'), analyticsUrl: v(env, 'YOUTUBE_ANALYTICS_URL'),
  };
}

/** Les trois sources d'un coup : `createStatsKit({ siteName, ...sourcesFromEnv() })`. */
export const sourcesFromEnv = (env: Env = process.env) => ({ umami: umamiFromEnv(env), gsc: gscFromEnv(env), youtube: youtubeFromEnv(env) });
