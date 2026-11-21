/*
 * Serveur de la démo : sert l'application construite (dist/demo/browser) et monte les routes de la librairie sur des services
 * factices. Rien ne sort de la machine ; l'« envoi » du rapport est seulement journalisé.
 *   PORT (5317 par défaut), DEMO_VIDE=1 : aucune source branchée (états « non configuré »).
 */
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStatsKit, type StatsKitConfig } from 'stats-kit/serveur';
import { fauxFetch, fauxSources } from '../faux/services.ts';

const port = Number(process.env['PORT'] || 5317);
const empty = process.env['DEMO_VIDE'] === '1';
const browser = fileURLToPath(new URL('../../dist/demo/browser/', import.meta.url));

/** Messages « envoyés » (consultables par les tests de bout en bout). */
const outbox: { subject: string; at: string; attachments: number }[] = [];

/** Données propres au site fictif (sa base) : demandes reçues par le formulaire. */
const extras: StatsKitConfig['extras'] = async (range) => {
  const days = range.days;
  const total = Math.round(days * 1.4), before = Math.round(days * 1.25);
  return {
    tiles: [
      { id: 'demandes', label: 'Demandes reçues', value: total, previous: before, sub: 'par le formulaire du site', group: null, highlight: false },
      { id: 'a-traiter', label: 'À traiter', value: 3, previous: null, sub: 'toutes périodes', group: null, highlight: true },
    ],
    tables: [{ id: 'sujets', title: 'Demandes reçues par sujet', sub: null, head: 'Sujet', column: 'Demandes', section: 'actions', items: [
      { key: 'devis', label: 'Demande de devis', value: Math.round(total * 0.5), previous: Math.round(before * 0.45) },
      { key: 'visite', label: 'Visite de l’atelier', value: Math.round(total * 0.3), previous: Math.round(before * 0.35) },
      { key: 'autre', label: 'Autre question', value: Math.round(total * 0.2), previous: Math.round(before * 0.2) },
    ] }],
    funnel: { label: 'Demandes reçues', value: total },
  };
};

export async function demoApp() {
  const sources = empty ? { umami: null, gsc: null, youtube: null } : await fauxSources();
  const kit = createStatsKit({
    siteName: 'Atelier Exemple',
    timeZone: 'Europe/Paris',
    ...sources,
    fetch: fauxFetch(),
    pages: {
      languages: ['fr', 'en', 'de'],
      labels: { '/': 'Accueil', '/services': 'Services', '/contact': 'Contact', '/a-propos': 'À propos', '/tarifs': 'Tarifs', '/realisations': 'Réalisations', '/kontakt': 'Contact (de)' },
      groups: [
        { id: 'produits', title: 'Fiches produit les plus vues', pattern: /^\/(?:produits|products)\/([a-z0-9-]+)$/, labels: { 'table-chene': 'Table en chêne', 'chaise-noyer': 'Chaise en noyer', 'etagere-frene': 'Étagère en frêne', 'oak-table': 'Table en chêne (en)' } },
        { id: 'articles', title: 'Articles les plus lus', pattern: /^\/articles\/([a-z0-9-]+)$/ },
      ],
    },
    events: { labels: { 'clic-telephone': 'Clic pour appeler', 'formulaire-envoye': 'Formulaire envoyé', 'clic-email': 'Clic sur l’adresse e-mail', 'telechargement-catalogue': 'Catalogue téléchargé', 'clic-itineraire': 'Itinéraire demandé', 'video-lecture': 'Vidéo lancée' } },
    goals: [
      { id: 'appels', label: 'Clics pour appeler', events: ['clic-telephone'] },
      { id: 'formulaires', label: 'Formulaires envoyés', events: ['formulaire-envoye'] },
    ],
    extras,
    sourceRequests: async (from, to) => {
      const days = Math.max(1, Math.round((to - from) / 86_400_000));
      return { total: Math.round(days / 9), bySubject: [{ key: 'devis', label: 'Demande de devis', value: Math.round(days / 14), previous: null }, { key: 'visite', label: 'Visite de l’atelier', value: Math.round(days / 25), previous: null }] };
    },
    report: {
      theme: { brand: '#1d3c9c' },
      statsUrl: `http://localhost:${port}/#statistiques`,
      send: async (m) => {
        outbox.push({ subject: m.subject, at: new Date().toISOString(), attachments: m.attachments.length });
        console.log(`[démo] rapport « ${m.subject} » prêt (${m.attachments.length} image(s)) : rien n'est envoyé.`);
        return 2;
      },
    },
  });

  const app = express();
  app.disable('x-powered-by');
  app.get('/api/demo/outbox', (_req, res) => res.json(outbox));
  app.use('/api/admin/audience', kit.middleware());
  if (existsSync(browser)) {
    app.use(express.static(browser));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile('index.html', { root: browser }));
  }
  return app;
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('demarrer.ts')) {
  const app = await demoApp();
  app.listen(port, '127.0.0.1', () => console.log(`Démo stats-kit sur http://localhost:${port}${existsSync(browser) ? '' : ' (application non construite : npm run demo:build)'}`));
}
