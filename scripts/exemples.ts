// Exemples de réponses (données factices de la démo, date fixe) : packages/contrat/exemples/*.json.
// Ils illustrent le contrat (docs/CONTRAT.md), sont validés par le schéma et servent aux tests des composants.
import { writeFileSync } from 'node:fs';
import { createStatsKit } from 'stats-kit/serveur';
import { fauxFetch, fauxSources } from '../demo/faux/services.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const sources = await fauxSources();
const kit = createStatsKit({
  siteName: 'Atelier Exemple', timeZone: 'Europe/Paris', ...sources, fetch: fauxFetch({ now: () => NOW }), now: () => NOW,
  pages: { languages: ['fr', 'en', 'de'], labels: { '/': 'Accueil', '/contact': 'Contact' }, groups: [{ id: 'produits', title: 'Fiches produit', pattern: /^\/produits\/([a-z0-9-]+)$/ }] },
  events: { labels: { 'clic-telephone': 'Clic pour appeler' } },
  goals: [{ id: 'appels', label: 'Clics pour appeler', events: ['clic-telephone'] }],
  extras: async () => ({ tiles: [{ id: 'demandes', label: 'Demandes reçues', value: 12, previous: 9, sub: null, group: null, highlight: false }], tables: [{ id: 'sujets', title: 'Demandes par sujet', sub: null, head: 'Sujet', column: 'Demandes', section: 'actions', items: [{ key: 'devis', label: 'Devis', value: 7, previous: 5 }] }], funnel: { label: 'Demandes reçues', value: 12 } }),
  sourceRequests: async () => ({ total: 2, bySubject: [{ key: 'devis', label: 'Devis', value: 2, previous: null }] }),
  report: { send: async () => 2 },
});
const dir = new URL('../packages/contrat/exemples/', import.meta.url);
const write = (name, data) => writeFileSync(new URL(name, dir), JSON.stringify(data, null, 1) + '\n');
write('overview.json', await kit.overview({ days: 30 }));
write('overview-24h.json', await kit.overview({ days: 1 }));
write('live.json', await kit.live());
write('search.json', await kit.search({ days: 28 }));
write('indexation.json', await kit.indexation());
write('youtube.json', await kit.youtube(28));
const unconfigured = createStatsKit({ siteName: 'Vide', now: () => NOW, world: null });
write('overview-non-configure.json', await unconfigured.overview({ days: 7 }));
write('search-non-configure.json', await unconfigured.search({ days: 28 }));
write('youtube-non-configure.json', await unconfigured.youtube(28));
console.log('Exemples écrits dans packages/contrat/exemples/');
