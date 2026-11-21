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
export {};
