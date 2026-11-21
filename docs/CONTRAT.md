# Contrat de données (version 1)

Ce document décrit les réponses JSON échangées entre le serveur et les composants. Il permet d'écrire un serveur dans un autre langage (.NET, PHP…) qui alimente les composants Angular sans changement.

- Source unique : les types TypeScript de [`packages/contrat/src/types.ts`](../packages/contrat/src/types.ts).
- Schéma JSON généré depuis ces types : [`packages/contrat/schema/contrat.schema.json`](../packages/contrat/schema/contrat.schema.json) (une définition par réponse : `StatsOverview`, `LiveResponse`, `SearchOverview`, `IndexationResponse`, `YoutubeOverview`, `ReportPreview`, `ReportSendResult`). La CI vérifie qu'il est à jour.
- Exemples complets, validés par le schéma à chaque test : [`packages/contrat/exemples/`](../packages/contrat/exemples/).

## Conventions

| Sujet | Règle |
|---|---|
| Version | chaque réponse porte `"version": 1` ; elle change à chaque modification incompatible. Un champ ajouté ne change pas la version. |
| Noms | camelCase, en anglais (vocabulaire d'Umami : `pageviews`, `visitors`, `visits`, `bounces`, `totaltime`). |
| Instants | chaînes ISO 8601 en UTC : `"2026-11-16T08:00:00.000Z"`. |
| Jours | `"AAAA-MM-JJ"`. |
| Créneaux d'une série | `"AAAA-MM-JJ"` (jour) ou `"AAAA-MM-JJTHH"` (heure), **dans le fuseau de la période** (`range.timeZone`) ; les composants les affichent sans conversion. |
| Séries | continues : un créneau par jour ou par heure de la période, zéro quand la source n'a rien. Les tableaux de valeurs ont la longueur de `slots`. |
| Durées, taux | secondes ; taux de 0 à 1 (sauf `averageViewPercentage`, de 0 à 100 comme YouTube). |
| Valeurs inconnues | `null`, jamais un champ absent ; listes vides : `[]`. |
| État d'une source | `status` : `ok`, `not-configured` (aucun réglage : rien n'est appelé) ou `error` (la source n'a pas répondu ; `error` donne un message court). La réponse garde toujours la même forme, chiffres à zéro. |
| Erreurs HTTP | réservées aux pannes du serveur lui-même (500) et à l'envoi du rapport (503 : envoi non prévu, 502 : envoi en échec). Une source absente ou en panne répond 200 avec `status`. |
| Libellés | `label` est fourni quand le site a donné un nom (« Accueil » pour `/`) ; sinon `null` et les composants calculent un libellé à partir de `key` (nom de pays, de langue, d'appareil, de navigateur, de canal, en langue du lecteur). |

## Routes

Toutes relatives au point de montage choisi par le site (par exemple `/api/admin/audience` ; éviter « analytics », « stats », « track », bloqués par les bloqueurs de publicités).

| Méthode et chemin | Paramètres | Réponse |
|---|---|---|
| `GET /overview` | `days` (1 à 366, 30 par défaut ; 1 = 24 heures, par heure) ou `from`, `to` (`AAAA-MM-JJ`, jours inclus, dans le fuseau) | `StatsOverview` |
| `GET /live` | — | `LiveResponse` |
| `GET /search` | `days` (1 à 480, 28 par défaut) ou `from`, `to` | `SearchOverview` |
| `GET /search/indexation` | — | `IndexationResponse` |
| `GET /youtube` | `days` (1 à 90, 28 par défaut) | `YoutubeOverview` |
| `GET /report/preview` | comme `/overview` (7 jours par défaut) | `ReportPreview` |
| `POST /report/send` | comme `/overview` | `ReportSendResult` |
| `GET /world.json` | — | fond de carte GeoJSON (Natural Earth 1:110m, chaque pays porte `properties.iso2`) |

Un serveur tiers peut servir le fond de carte depuis [`packages/serveur/assets/world-110m.json`](../packages/serveur/assets/world-110m.json), ou indiquer une autre adresse aux composants (`worldUrl`).

## `StatsOverview` — page Statistiques

| Champ | Type | Contenu |
|---|---|---|
| `version`, `status`, `error`, `generatedAt` | | voir conventions |
| `range` | `Range` | `from`, `to` (fin exclue), `days`, `unit` (`hour` pour 24 heures, `day` sinon), `timeZone`, `previousFrom`, `previousTo` (période précédente de même durée, qui finit où commence la période) |
| `totals` | `Totals` | `pageviews`, `visitors`, `visits`, `bounces` (visites d'une page), `totaltime` (secondes cumulées) |
| `previous` | `Totals` ou `null` | mêmes totaux sur la période précédente |
| `active` | nombre ou `null` | visiteurs actifs à l'instant (5 dernières minutes) |
| `series` | `Series` | `unit`, `slots`, `pageviews[]`, `visitors[]`, `previousPageviews[]` (alignée créneau par créneau) ou `null` |
| `last24h` | `Series` | dernières 24 heures, par heure, quelle que soit la période |
| `heatmap` | 7 × 24 nombres | pages vues par jour de la semaine (lundi = 0) et par heure, dans le fuseau |
| `breakdowns` | `Breakdowns` | classements triés par valeur décroissante, chacun une liste d'`Item` : `pages`, `entries`, `exits`, `referrers` (clé vide = accès direct), `channels`, `countries` (ISO alpha-2), `regions` (« FR-PAC »), `cities`, `languages` (navigateur), `siteLanguages` (préfixe de chemin), `devices`, `browsers`, `os`, `screens`, `events`, `hostnames`, `utmSources`, `utmMediums`, `utmCampaigns` |
| `pages` | `PageRow[]` | détail par page : `key`, `label`, `views`, `visitors`, `entries`, `exits`, `bounces`, `totaltime`, `previousViews` ; vide si la source ne le fournit pas (les composants se rabattent sur `breakdowns.pages`) |
| `groups` | `ItemGroup[]` | regroupements définis par le site : `id`, `title`, `items` |
| `goals` | `Goal[]` | objectifs : `id`, `label`, `value`, `previous` |
| `counts` | | `countries`, `events` : nombres distincts sur la période, ou `null` |
| `sessions` | `Session[]` | visites récentes : `country`, `city`, `device`, `browser`, `os`, `views`, `lastAt` |
| `extras` | `Extras` ou `null` | données propres au site : `tiles` (`id`, `label`, `value` nombre ou texte, `previous`, `sub`, `group`, `highlight`), `tables` (`id`, `title`, `sub`, `head`, `column`, `section` : `pages`, `sources`, `audience` ou `actions`, `items`), `funnel` (`{ label, value }` : dernière étape de l'entonnoir) |
| `dashboardUrl` | texte ou `null` | tableau de bord de la source (bouton « Ouvrir Umami ») |

`Item` : `{ key, label, value, previous }` — `previous` vaut `null` quand la période précédente n'est pas demandée pour ce classement.

## `LiveResponse`

`{ version, active, at }` — `active` vaut `null` si la source ne répond pas.

## `SearchOverview` — page Google

| Champ | Contenu |
|---|---|
| `property` | propriété Search Console (« sc-domain:exemple.org ») |
| `serviceAccount` | adresse du compte de service à ajouter à la propriété (affichée quand Google refuse l'accès), `null` en OAuth |
| `start`, `end`, `days`, `previousStart`, `previousEnd` | jours inclus ; la période s'arrête deux jours avant aujourd'hui (délai de publication de Google) |
| `totals`, `previous` | `SearchTotals` : `clicks`, `impressions`, `ctr` (0 à 1), `position` (moyenne, 0 sans affichage) |
| `series`, `previousSeries` | `SearchDay[]` : `date` et les mêmes mesures |
| `queries`, `previousQueries`, `pages`, `previousPages`, `countries`, `previousCountries`, `devices`, `previousDevices`, `appearance` | `SearchRow[]` : `key` (recherche, adresse complète de page, pays ISO alpha-3 en minuscules, `DESKTOP`/`MOBILE`/`TABLET`, type d'apparence) et les mesures |
| `queryPages` | `QueryPage[]` : `query`, `page` et les mesures |
| `sitemaps` | `Sitemap[]` (`path`, `lastDownloaded`, `errors`, `warnings`, `pending`, `submitted`, `indexed`) ou `null` |
| `brandTerms` | mots du nom du site (séparation marque / hors marque) |

Les opportunités (fort potentiel, hausses, baisses, nouvelles recherches, pages peu cliquées, pages perdues, cannibalisation) sont calculées par les composants à partir de ces listes : un serveur tiers n'a pas à les produire (fonctions de [`analyses.ts`](../packages/contrat/src/analyses.ts)).

## `IndexationResponse`

`{ version, status, error, checkedAt, total, indexed, pages: [{ url, verdict, state, lastCrawl, indexed }] }` — `status` vaut `not-configured` sans plan du site à lire.

## `YoutubeOverview` — page YouTube

| Champ | Contenu |
|---|---|
| `channelUrl` | chaîne publique, utile même sans réglage |
| `channel` | `id`, `title`, `handle`, `url`, `studioUrl`, `thumbnail`, `subscribers` (`null` si masqués), `views`, `videos`, `createdAt` ; `null` sans chaîne |
| `videos` | la plus récente d'abord : `id`, `url`, `title`, `label` (nom donné par le site), `publishedAt`, `duration` (s), `visibility`, `views`, `likes`, `comments`, `minutes`, `averageViewDuration`, `averageViewPercentage` |
| `days`, `start`, `end`, `totals`, `previous` | période choisie et précédente : `views`, `minutes`, `gained`, `lost`, `averageViewDuration` |
| `series` | 180 jours `{ date, views, minutes, gained, lost }`, jusqu'à la veille |
| `traffic` | provenance des vues sur 28 jours : `source` (type YouTube, `YT_SEARCH`…), `views`, `minutes` |
| `analyticsError` | message si YouTube Analytics a refusé (chaîne et vidéos restent affichées) |
| `site` | ce que la chaîne apporte au site : `visits`, `visitors`, `previousVisits`, `referred`, `landing` (`Item[]`), `requests`, `previousRequests`, `requestsBySubject` ; `null` si le site ne compte rien |

## `ReportPreview` et `ReportSendResult`

- `ReportPreview` : `{ version, subject, html, text }` — `html` contient les images en `data:` (affichable hors messagerie).
- `ReportSendResult` : `{ version, ok, recipients, error }` — `error` vaut `send-not-configured` si le site n'a pas fourni de fonction d'envoi.

## Écrire un serveur compatible en .NET

- Sérialiser en camelCase et **écrire les `null`** : `new JsonSerializerOptions(JsonSerializerDefaults.Web) { DefaultIgnoreCondition = JsonIgnoreCondition.Never }`.
- Les créneaux sont des chaînes calculées dans le fuseau du site (`TimeZoneInfo.ConvertTime`), pas des `DateTime` sérialisés.
- `heatmap` : `int[7][24]`, lundi en premier (`((int)jour.DayOfWeek + 6) % 7`).
- Remplir les séries de zéros pour les créneaux sans donnée, et aligner `previousPageviews` sur `slots`.
- Valider les réponses contre le schéma pendant les tests (par exemple avec `JsonSchema.Net`), à partir des exemples fournis.
- Correspondance avec une vue d'ensemble .NET existante de type « AnalyticsOverview » : `Summary` → `totals` (`TotalTimeSeconds` → `totaltime`), `Previous` → `previous`, `ActiveVisitors` → `active`, `Series` (par jour) → `series` (`Date` → `slots`, `Pageviews` → `pageviews`, `Visits` → `visitors`), `Hourly` → `last24h`, `TopPages`… `TopEvents` → `breakdowns.*` (`Label` → `key`, `Count` → `value`), `RecentSessions` → `sessions`, `Heatmap` → `heatmap`, `DashboardUrl` → `dashboardUrl`, `Available = false` → `status: "not-configured"`.
