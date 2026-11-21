# Migrer un site existant vers stats-kit

stats-kit réunit ce qui avait été recopié de site en site : connecteurs, agrégations, pages d'administration et rapport hebdomadaire. Ce guide décrit, pour chaque type de site, comment passer à la librairie **sans perdre de fonction**. Les sites sont décrits de façon générique.

Principe commun :

1. installer la librairie (`npm i <dépôt>#vX.Y.Z`, voir le README) ;
2. côté serveur, remplacer les modules maison (Umami, Search Console, YouTube, rapport, kit d'e-mail, carte PNG) par **un seul** `createStatsKit(…)` monté derrière l'authentification de l'administration ;
3. côté Angular, remplacer les écrans maison par `<sk-statistiques>`, `<sk-search-console>` et `<sk-youtube>` ;
4. reporter les réglages du site (libellés, regroupements, objectifs, données de la base, textes, couleurs) dans la configuration ;
5. supprimer les copies : modules serveur, composants, `world-110m.json` du dossier public, Leaflet et ses réglages (`allowedCommonJsDependencies`, feuille de style), tests devenus inutiles ;
6. garder les tests de bout en bout du site sur ses propres pages (ils vérifient l'intégration), en les adaptant aux nouvelles classes `sk-*`.

Les variables d'environnement gardent leurs noms (`UMAMI_*`, `GSC_*`, `YOUTUBE_*`) : `sourcesFromEnv()` les lit telles quelles.

## Correspondance générale

| Avant (copie maison) | Avec stats-kit |
|---|---|
| `server/umami.ts` (connexion, `collect`, `analytics`, `group`, `heatmap`, `pageRows`, `resolveRange`, cache 2 min) | `createStatsKit({ umami })`, routes `/overview` et `/live` ; `pages.languages` pour le regroupement par langue |
| `server/gsc.ts` (JWT de compte de service, OAuth, `performance`, `sitemaps`, `indexation`) | `createStatsKit({ gsc })`, routes `/search` et `/search/indexation` ; `gsc.indexationFilter` pour ne contrôler qu'une partie du plan du site |
| `server/youtube.ts` (chaîne, vidéos, 180 jours, provenance, visites venues de YouTube) | `createStatsKit({ youtube })`, route `/youtube` ; `youtube.videoLabel` et `youtube.extraVideoIds` pour relier les vidéos aux contenus du site ; `sourceRequests` pour les demandes qui suivent une visite |
| `server/report.ts`, `email-kit.ts`, `worldmap.ts` | `stats.report()`, `stats.sendReport()`, route `/report/preview` ; `report.send` = fonction d'envoi existante du site ; `startWeeklyReport` pour la planification |
| Libellés de pages et d'événements (`PAGE_LABELS`, `EVENT_LABELS`…) | `pages.labels`, `events.labels` |
| Fiches, secteurs, articles comptés à part | `pages.groups` (un motif par regroupement, libellés facultatifs) |
| Événements « appel », « devis », « formulaire envoyé » additionnés | `goals` |
| Demandes reçues, à traiter, rappels (base du site) | `extras` : tuiles (mise en avant avec `highlight`), tableaux (par sujet, par langue), dernière étape de l'entonnoir |
| Textes du rapport modifiables dans l'administration (objet, titre, introduction, pied) | `texts.report.subject`, `title`, `intro`, `footer`, relus à chaque envoi (passer une fonction qui recrée le kit, ou des textes lus en base au démarrage) ; variables `{site}`, `{from}`, `{to}`, `{period}`, `{days}` à la place de l'ancienne `{periode}` |
| Couleurs du rapport et de la carte | `report.theme.brand` (le reste en découle), logo par `report.theme.logo` |
| `stats-kit.ts` / `admin/stats.ts` / `admin/google.ts` / `admin/youtube.ts` / `world-map.ts` | composants de `stats-kit/angular` |
| Variables CSS `--adm-*` | variables `--sk-*` (voir le README) ; le site peut les relier : `--sk-brand: var(--adm-brand)` |

## Site Node + Angular, version la plus complète côté Node (Umami, Search Console, YouTube, rapport, demandes)

C'est la copie la plus proche de la librairie : la migration est surtout un branchement.

Serveur :

```ts
const stats = createStatsKit({
  siteName: NOM_DU_SITE, timeZone: 'Europe/Paris', locale: 'fr', ...sourcesFromEnv(),
  pages: { languages: LANGUES_DU_SITE, labels: PAGE_LABELS, groups: [
    { id: 'fiches', title: 'Fiches les plus vues', pattern: /^\/produits\/([a-z0-9-]+)$/, labels: (k) => dictionnaire[`products.${k}.name`] },
    { id: 'zones', title: 'Secteurs les plus vus', pattern: /^\/secteurs\/([a-z0-9-]+)$/, labels: SECTEUR_LABELS },
    { id: 'articles', title: 'Articles les plus lus', pattern: /^\/articles\/([a-z0-9-]+)$/ },
  ] },
  events: { labels: EVENT_LABELS },
  goals: [{ id: 'appels', label: 'Clics pour appeler', events: CALL_EVENTS }, { id: 'devis', label: 'Clics « devis »', events: QUOTE_EVENTS }, { id: 'envois', label: 'Formulaires envoyés', events: ['formulaire-envoye'] }],
  extras: async (range) => demandesDuSite(range),           // tuiles « Demandes reçues », « À traiter », « Rappels », tableaux par sujet et par langue
  sourceRequests: (from, to, source) => demandesVenuesDe(source, from, to),
  youtube: youtubeFromEnv() && { ...youtubeFromEnv()!, channelUrl: ADRESSE_DE_LA_CHAINE, videoLabel: (v) => filmDeLaVideo(v.id), extraVideoIds: anciennesVersions },
  gsc: gscFromEnv() && { ...gscFromEnv()!, sitemapUrl: `${URL_PUBLIQUE}/sitemap.xml`, indexationFilter: (u) => u.includes('/fr'), brandTerms: ['nom-du-site'] },
  report: { theme: { brand: COULEUR }, statsUrl: `${URL_PUBLIQUE}/admin/stats`, send: (m) => sendMail({ to: destinataires(), ...m }) },
});
app.use('/api/admin/audience', exigerAdmin, stats.middleware());
startWeeklyReport({ schedule: { weekday: 1, hour: 8, timeZone: 'Europe/Paris' }, getLastSent: () => privateGet('report.lastSent'), setLastSent: (w) => privateSet('report.lastSent', w), send: async () => (await stats.sendReport({ days: 7 }, true)).ok });
```

- Garder l'écran de réglages du rapport (activé, destinataires, textes) : il alimente `report.send` (destinataires) et les textes. L'interrupteur « activé » se traduit par `send` qui renvoie `false` sans rien faire, ou par l'arrêt de `startWeeklyReport`.
- La fonction d'envoi existante accepte une pièce jointe en ligne : passer `m.attachments` (carte, logo).
- Le réglage « ne pas compter ce navigateur » (visites de l'équipe) reste dans le site : l'afficher au-dessus de `<sk-statistiques>`.
- Tableau de bord et autres écrans qui lisaient `/api/admin/stats` : lire `/api/admin/audience/overview` (mêmes informations, forme du contrat).
- Tests e2e : le faux Umami du site peut rester ; les sélecteurs `.kpi`, `.top`, `.geo`, `.heat .cell`, `table.sessions` deviennent `sk-tile`, `sk-metric-table`, `sk-world-map`, `.sk-heat__cell`, `.sk-sessions table`.

Écarts à connaître (non repris, à garder dans le site si besoin) :

- la colonne « 7 derniers jours » du tableau des actions (série par événement) ;
- la carte « Où en est-on cette semaine ? » de l'écran Google ;
- l'état de la publication automatique des vidéos (fichier de publication) : seul le lien vidéo → contenu est repris (`videoLabel`, `extraVideoIds`).

## Site Node + Angular, copie plus ancienne (Umami et Search Console, suivi des conversions)

- Même branchement que ci-dessus, sans YouTube ni `extras` s'il n'y a pas de base de demandes.
- Les indicateurs de conversion (clics vers l'e-mail, vers un réseau professionnel, formulaire envoyé) deviennent des `goals`.
- Le bloc « 7 derniers jours contre les 7 d'avant » est couvert par les tuiles (évolution par rapport à la période précédente) et, sur l'écran Google, par les tuiles « 7 derniers jours ».
- L'écran Search Console embarqué gagne les opportunités, l'apparence et l'indexation.

## Site .NET + Angular (version de référence : carte, direct, 24 h, carte de chaleur, rapport illustré, 11 langues)

Le serveur reste en .NET ; seul le contrat change.

1. **Contrôleur** : à l'adresse actuelle (déjà sans « analytics » dans le chemin), renvoyer `StatsOverview` au lieu de la vue d'ensemble maison. La correspondance champ par champ est dans [CONTRAT.md](CONTRAT.md#écrire-un-serveur-compatible-en-net) ; à compléter : `range`, `series.slots` en heure locale, `previousPageviews` (série de la période précédente), `breakdowns.channels`, `regions`, `hostnames`, `utm*` (même appel `metrics` avec d'autres `type`), `pages` (Umami `metrics/expanded`), `goals`, `counts`, `extras`. Ajouter `GET …/live`. Servir `world-110m.json` (déjà présent dans le projet) en `GET …/world.json`, ou passer `worldUrl` au composant.
2. **Rapport** : garder le rapport C# existant (déjà en tableaux, carte PNG dessinée côté serveur, aperçu) derrière `GET …/report/preview` et `POST …/report/send`, en renvoyant `ReportPreview` et `ReportSendResult`. Le bloc « coûts » (usage des services d'IA, abonnements) reste propre au site ; dans la page, l'exposer en `extras` (tuiles et tableau « par fournisseur »).
3. **Angular** : remplacer le composant d'analyse par `<sk-statistiques [locale]="langueActive()" [texts]="textesDuSite()" />` ; les appels passent par `HttpClient`, l'intercepteur JWT du site s'applique. Retirer Leaflet et la copie des centroïdes.
4. **Langues** : la librairie fournit le français et l'anglais. Pour les neuf autres langues du site, construire `baseTexts` à partir des fichiers de traduction existants (même forme que `LANGUES.fr`) et le passer à `provideStatsKit` ; en attendant, les langues sans traduction retombent sur le français.
5. **Rafraîchissement** : le site actualisait toute la page toutes les 15 secondes ; la librairie actualise le direct toutes les 30 secondes et le reste toutes les 2 minutes (`liveMs`, `refreshMs` pour retrouver l'ancien rythme).

Écarts à connaître : l'alerte de pic de trafic (envoi d'un message quand l'heure écoulée dépasse la moyenne) n'est pas dans la librairie ; elle reste dans le site.

## Console d'administration multi-sources (en construction)

- Une console qui suit plusieurs sites crée **un kit par site** (`createStatsKit` avec les réglages de chacun) et les monte sous une adresse par site (`/api/sites/:id/audience`) ; chaque page reçoit `apiUrl` du site affiché.
- Ses propres sources (publication YouTube, rapport maison) se branchent par `youtube.videoLabel` / `extraVideoIds`, `extras` et `report.send`.
- Manque encore dans la librairie : un sélecteur de site et une vue de synthèse de plusieurs sites côte à côte ; un rapport qui regroupe plusieurs sites.

## Vérifier qu'aucune fonction ne se perd

Pour chaque site, avant de supprimer l'ancienne page :

- comparer, sur la même période, les totaux de l'ancienne et de la nouvelle page (visiteurs, visites, pages vues, rebond, durée) ;
- vérifier la carte, les 24 heures, la carte de chaleur, les classements, les sessions, l'export CSV, l'impression ;
- comparer le rapport : aperçu, puis un envoi réel à une adresse de test, ouvert dans Outlook et sur téléphone ;
- vérifier les écrans Google et YouTube et leurs états « non configuré » ;
- passer l'audit d'accessibilité (axe) de la page intégrée, en clair et en sombre.
