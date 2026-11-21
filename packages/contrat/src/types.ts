/*
 * Contrat de données entre le serveur et les composants : ce que renvoient les routes de la librairie (ou d'un serveur écrit dans
 * un autre langage, .NET par exemple) et ce qu'affichent les composants. Tout est en JSON simple : nombres, chaînes, tableaux.
 * Le schéma JSON (schema/contrat.schema.json) est généré à partir de ce fichier ; docs/CONTRAT.md le décrit champ par champ.
 *
 * Conventions :
 *  - instants : chaînes ISO 8601 en UTC (« 2026-11-16T08:00:00.000Z ») ;
 *  - jours : « AAAA-MM-JJ » ; créneaux horaires : « AAAA-MM-JJTHH », toujours dans le fuseau de la période (`range.timeZone`) ;
 *  - durées en secondes ; taux entre 0 et 1 ;
 *  - une valeur inconnue vaut `null` (jamais absente), une liste vide vaut `[]`.
 */

/** Version du contrat ; elle change à chaque modification incompatible. */
export type ContractVersion = 1;

/** État d'une source : `ok`, `not-configured` (réglages absents : rien n'est appelé) ou `error` (la source n'a pas répondu). */
export type SourceStatus = 'ok' | 'not-configured' | 'error';

/** Granularité d'une série : un point par jour ou par heure. */
export type Unit = 'day' | 'hour';

/* ------------------------------------------------------------------------------------------------ fréquentation (Umami) */

/** Période affichée et période précédente de même durée. */
export interface Range {
  /** Début (inclus), instant UTC. */
  from: string;
  /** Fin (exclue), instant UTC. */
  to: string;
  /** Nombre de jours couverts (1 pour les dernières 24 heures). */
  days: number;
  /** Granularité de la série principale : `hour` pour 24 heures, `day` au-delà. */
  unit: Unit;
  /** Fuseau IANA dans lequel sont exprimés les créneaux (« Europe/Paris »). */
  timeZone: string;
  /** Début de la période précédente, instant UTC. */
  previousFrom: string;
  /** Fin de la période précédente (= début de la période), instant UTC. */
  previousTo: string;
}

/** Totaux d'une période. */
export interface Totals {
  /** Pages vues. */
  pageviews: number;
  /** Visiteurs distincts. */
  visitors: number;
  /** Visites (sessions). */
  visits: number;
  /** Visites d'une seule page. */
  bounces: number;
  /** Temps passé cumulé, en secondes. */
  totaltime: number;
}

/** Ligne d'un classement (page, pays, source…). */
export interface Item {
  /** Valeur brute renvoyée par la source : chemin, code pays ISO, code langue, nom d'événement… */
  key: string;
  /** Libellé lisible fourni par le serveur (réglages du site) ; sinon les composants en calculent un à partir de `key`. */
  label: string | null;
  /** Nombre (visites, vues ou occurrences selon le classement). */
  value: number;
  /** Même nombre sur la période précédente ; `null` si la source ne le fournit pas. */
  previous: number | null;
}

/** Série temporelle continue : un créneau par jour ou par heure de la période, même sans donnée (zéro). */
export interface Series {
  unit: Unit;
  /** Créneaux dans le fuseau de la période : « AAAA-MM-JJ » (jour) ou « AAAA-MM-JJTHH » (heure). */
  slots: string[];
  /** Pages vues, une valeur par créneau. */
  pageviews: number[];
  /** Visiteurs (sessions Umami), une valeur par créneau. */
  visitors: number[];
  /** Pages vues de la période précédente, alignées créneau par créneau ; `null` si inconnues. */
  previousPageviews: number[] | null;
}

/** Détail d'une page (toutes langues réunies si le site regroupe ses chemins). */
export interface PageRow {
  /** Chemin logique (« /contact »). */
  key: string;
  label: string | null;
  views: number;
  visitors: number;
  /** Visites commencées sur cette page. */
  entries: number;
  /** Visites terminées sur cette page. */
  exits: number;
  /** Visites d'une seule page commencées ici. */
  bounces: number;
  /** Temps passé cumulé sur la page, en secondes. */
  totaltime: number;
  /** Vues de la période précédente ; `null` si inconnues. */
  previousViews: number | null;
}

/** Visite récente, sans identification de la personne. */
export interface Session {
  /** Code pays ISO 3166-1 alpha-2. */
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  views: number;
  /** Dernière activité, instant UTC. */
  lastAt: string | null;
}

/** Objectif du site : total d'un ou plusieurs événements suivis (clic pour appeler, formulaire envoyé…). */
export interface Goal {
  id: string;
  label: string;
  value: number;
  previous: number | null;
}

/** Regroupement de pages défini par le site (fiches produit, articles…). */
export interface ItemGroup {
  id: string;
  title: string;
  items: Item[];
}

/** Section de la page Statistiques où ranger un tableau. */
export type Section = 'pages' | 'sources' | 'audience' | 'actions';

/** Tuile chiffrée ajoutée par le site (données de sa propre base : demandes reçues, commandes…). */
export interface ExtraTile {
  id: string;
  label: string;
  /** Nombre, ou texte déjà mis en forme. */
  value: number | string;
  previous: number | null;
  /** Contexte sous le chiffre. */
  sub: string | null;
  /** Titre du groupe de tuiles ; `null` : groupe des données du site. */
  group: string | null;
  /** Mise en avant (à traiter, en attente…). */
  highlight: boolean;
}

/** Tableau ajouté par le site. */
export interface ExtraTable {
  id: string;
  title: string;
  sub: string | null;
  /** Titre de la colonne des libellés. */
  head: string;
  /** Titre de la colonne des nombres. */
  column: string;
  section: Section;
  items: Item[];
}

/** Données propres au site, affichées avec celles des sources (elles s'affichent même si Umami ne répond pas). */
export interface Extras {
  tiles: ExtraTile[];
  tables: ExtraTable[];
  /** Dernière étape de l'entonnoir (« Demandes reçues ») ; `null` sans étape. */
  funnel: { label: string; value: number } | null;
}

/** Classements d'une période. Chaque liste est triée par valeur décroissante. */
export interface Breakdowns {
  /** Pages vues par chemin logique. */
  pages: Item[];
  /** Pages d'entrée (visites). */
  entries: Item[];
  /** Pages de sortie (visites). */
  exits: Item[];
  /** Sites d'où viennent les visites (domaine ; clé vide = accès direct). */
  referrers: Item[];
  /** Canaux d'acquisition Umami (direct, organicSearch…). */
  channels: Item[];
  /** Pays (code ISO). */
  countries: Item[];
  /** Régions (« FR-PAC »). */
  regions: Item[];
  cities: Item[];
  /** Langue du navigateur des visiteurs (code). */
  languages: Item[];
  /** Langue du site consultée (préfixe de chemin), si le site est multilingue. */
  siteLanguages: Item[];
  /** Appareils (desktop, laptop, mobile, tablet). */
  devices: Item[];
  browsers: Item[];
  os: Item[];
  /** Tailles d'écran (« 390x844 »). */
  screens: Item[];
  /** Événements suivis (nom). */
  events: Item[];
  /** Adresses (nom d'hôte) consultées. */
  hostnames: Item[];
  utmSources: Item[];
  utmMediums: Item[];
  utmCampaigns: Item[];
}

/** Nombre de dimensions distinctes sur la période (`null` si la source ne le donne pas). */
export interface Counts {
  countries: number | null;
  events: number | null;
}

/** Réponse de `GET {base}/overview` : tout ce qu'affiche la page Statistiques. */
export interface StatsOverview {
  version: ContractVersion;
  status: SourceStatus;
  /** Message court quand `status` vaut `error`. */
  error: string | null;
  /** Instant de calcul, UTC. */
  generatedAt: string;
  range: Range;
  totals: Totals;
  /** Totaux de la période précédente ; `null` si inconnus. */
  previous: Totals | null;
  /** Visiteurs actifs à l'instant (5 dernières minutes) ; `null` si inconnu. */
  active: number | null;
  series: Series;
  /** Dernières 24 heures, heure par heure (indépendant de la période choisie). */
  last24h: Series;
  /** Pages vues par jour de la semaine (lundi = 0) et par heure (0 à 23), dans le fuseau de la période : 7 lignes de 24 nombres. */
  heatmap: number[][];
  breakdowns: Breakdowns;
  /** Détail par page ; vide si la source ne le fournit pas (les composants se rabattent alors sur `breakdowns.pages`). */
  pages: PageRow[];
  groups: ItemGroup[];
  goals: Goal[];
  counts: Counts;
  sessions: Session[];
  extras: Extras | null;
  /** Adresse du tableau de bord de la source (Umami), pour aller plus loin ; `null` pour ne pas l'afficher. */
  dashboardUrl: string | null;
}

/** Réponse de `GET {base}/live` : visiteurs actifs. */
export interface LiveResponse {
  version: ContractVersion;
  active: number | null;
  at: string;
}

/* ------------------------------------------------------------------------------------------------ Google Search Console */

export interface SearchTotals {
  clicks: number;
  impressions: number;
  /** Taux de clic, de 0 à 1. */
  ctr: number;
  /** Position moyenne (1 = premier résultat) ; 0 sans affichage. */
  position: number;
}

export interface SearchRow extends SearchTotals {
  /** Recherche, adresse de page, code pays ISO 3166-1 alpha-3 (minuscules, comme Google), appareil… */
  key: string;
}

export interface SearchDay extends SearchTotals {
  date: string;
}

export interface QueryPage extends SearchTotals {
  query: string;
  page: string;
}

export interface Sitemap {
  path: string;
  lastDownloaded: string | null;
  errors: number;
  warnings: number;
  pending: boolean;
  submitted: number;
  indexed: number | null;
}

/** Réponse de `GET {base}/search` : performances dans la recherche Google. */
export interface SearchOverview {
  version: ContractVersion;
  status: SourceStatus;
  error: string | null;
  generatedAt: string;
  /** Propriété Search Console (« sc-domain:exemple.org »). */
  property: string | null;
  /** Adresse du compte de service à ajouter comme utilisateur de la propriété ; `null` en mode OAuth ou sans réglage. */
  serviceAccount: string | null;
  /** Période (jours inclus) : Google publie avec deux à trois jours de retard, elle s'arrête donc avant aujourd'hui. */
  start: string;
  end: string;
  days: number;
  previousStart: string;
  previousEnd: string;
  totals: SearchTotals;
  previous: SearchTotals;
  series: SearchDay[];
  previousSeries: SearchDay[];
  queries: SearchRow[];
  previousQueries: SearchRow[];
  pages: SearchRow[];
  previousPages: SearchRow[];
  countries: SearchRow[];
  previousCountries: SearchRow[];
  devices: SearchRow[];
  previousDevices: SearchRow[];
  /** Apparence dans les résultats (extraits enrichis, vidéos…). */
  appearance: SearchRow[];
  queryPages: QueryPage[];
  /** Plans du site ; `null` si Google les a refusés. */
  sitemaps: Sitemap[] | null;
  /** Mots du nom du site : séparent les recherches « marque » des autres. */
  brandTerms: string[];
}

export interface Inspection {
  url: string;
  /** PASS, NEUTRAL, FAIL, UNKNOWN ou ERROR. */
  verdict: string;
  state: string;
  lastCrawl: string | null;
  indexed: boolean;
}

/** Réponse de `GET {base}/search/indexation` : état d'indexation page par page (lent : gardé plusieurs heures). */
export interface IndexationResponse {
  version: ContractVersion;
  status: SourceStatus;
  error: string | null;
  checkedAt: string;
  total: number;
  indexed: number;
  pages: Inspection[];
}

/* ------------------------------------------------------------------------------------------------ YouTube */

export interface YoutubeChannel {
  id: string;
  title: string;
  handle: string | null;
  url: string;
  studioUrl: string;
  thumbnail: string | null;
  /** `null` si la chaîne masque son nombre d'abonnés. */
  subscribers: number | null;
  views: number;
  videos: number;
  createdAt: string | null;
}

export interface YoutubeVideo {
  id: string;
  url: string;
  title: string;
  /** Libellé donné par le site (nom du film…), ou `null`. */
  label: string | null;
  publishedAt: string | null;
  /** Durée en secondes. */
  duration: number;
  /** public, unlisted ou private. */
  visibility: string;
  views: number;
  likes: number | null;
  comments: number | null;
  /** Minutes regardées depuis la publication (YouTube Analytics) ; `null` tant que YouTube n'a rien compté. */
  minutes: number | null;
  averageViewDuration: number | null;
  /** Pourcentage moyen regardé (0 à 100). */
  averageViewPercentage: number | null;
}

export interface YoutubeDay {
  date: string;
  views: number;
  minutes: number;
  gained: number;
  lost: number;
}

export interface YoutubeTotals {
  views: number;
  minutes: number;
  gained: number;
  lost: number;
  /** Durée moyenne regardée par vue, en secondes. */
  averageViewDuration: number;
}

export interface YoutubeTraffic {
  /** Type de provenance YouTube (YT_SEARCH, RELATED_VIDEO…). */
  source: string;
  views: number;
  minutes: number;
}

/** Ce que la chaîne apporte au site : visites arrivées par un lien suivi (`utm_source`) et demandes qui suivent. */
export interface YoutubeSite {
  /** `null` si Umami n'est pas branché ou n'a pas répondu. */
  visits: number | null;
  visitors: number | null;
  previousVisits: number | null;
  /** Visites venues d'un domaine YouTube, lien suivi ou non. */
  referred: number | null;
  /** Pages d'arrivée. */
  landing: Item[];
  /** Demandes enregistrées par le site après une telle visite ; `null` si le site ne les compte pas. */
  requests: number | null;
  previousRequests: number | null;
  requestsBySubject: Item[];
}

/** Réponse de `GET {base}/youtube` : la chaîne, ses vidéos et ses statistiques. */
export interface YoutubeOverview {
  version: ContractVersion;
  status: SourceStatus;
  error: string | null;
  generatedAt: string;
  /** Chaîne publique (lien utile même sans réglage) ; `null` si inconnue. */
  channelUrl: string | null;
  channel: YoutubeChannel | null;
  videos: YoutubeVideo[];
  /** Jours de la période choisie. */
  days: number;
  start: string;
  end: string;
  totals: YoutubeTotals;
  previous: YoutubeTotals;
  /** 180 jours, du plus ancien au plus récent, jusqu'à la veille (YouTube publie avec un à deux jours de retard). */
  series: YoutubeDay[];
  traffic: YoutubeTraffic[];
  /** Message si YouTube Analytics a refusé (la chaîne et les vidéos s'affichent quand même). */
  analyticsError: string | null;
  site: YoutubeSite | null;
}

/* ------------------------------------------------------------------------------------------------ rapport */

/** Réponse de `GET {base}/report/preview` : le rapport tel qu'il partirait, images incluses. */
export interface ReportPreview {
  version: ContractVersion;
  subject: string;
  html: string;
  text: string;
}

/** Réponse de `POST {base}/report/send`. */
export interface ReportSendResult {
  version: ContractVersion;
  ok: boolean;
  /** Nombre de destinataires annoncé par le site. */
  recipients: number;
  error: string | null;
}

/** Ensemble des réponses (racine du schéma JSON). */
export interface Contract {
  overview: StatsOverview;
  live: LiveResponse;
  search: SearchOverview;
  indexation: IndexationResponse;
  youtube: YoutubeOverview;
  reportPreview: ReportPreview;
  reportSend: ReportSendResult;
}
