// Example responses (fake demo data, fixed date): packages/contract/examples/*.json.
// They illustrate the contract (docs/CONTRACT.md), are validated by the schema and feed the component tests.
import { writeFileSync } from 'node:fs';
import { createStatsKit } from 'stats-kit/server';
import { fakeFetch, fakeSources } from '../demo/fake/services.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const sources = await fakeSources();
const kit = createStatsKit({
  siteName: 'Example Workshop', timeZone: 'Europe/Paris', ...sources, fetch: fakeFetch({ now: () => NOW }), now: () => NOW,
  pages: { languages: ['en', 'fr', 'de'], labels: { '/': 'Home', '/contact': 'Contact' }, groups: [{ id: 'products', title: 'Product pages', pattern: /^\/products\/([a-z0-9-]+)$/ }] },
  events: { labels: { 'phone-click': 'Click to call' } },
  goals: [{ id: 'calls', label: 'Clicks to call', events: ['phone-click'] }],
  extras: async () => ({ tiles: [{ id: 'requests', label: 'Requests received', value: 12, previous: 9, sub: null, group: null, highlight: false }], tables: [{ id: 'subjects', title: 'Requests by subject', sub: null, head: 'Subject', column: 'Requests', section: 'actions', items: [{ key: 'quote', label: 'Quote', value: 7, previous: 5 }] }], funnel: { label: 'Requests received', value: 12 } }),
  sourceRequests: async () => ({ total: 2, bySubject: [{ key: 'quote', label: 'Quote', value: 2, previous: null }] }),
  report: { send: async () => 2 },
});
const dir = new URL('../packages/contract/examples/', import.meta.url);
const write = (name: string, data: unknown) => writeFileSync(new URL(name, dir), JSON.stringify(data, null, 1) + '\n');
write('overview.json', await kit.overview({ days: 30 }));
write('overview-24h.json', await kit.overview({ days: 1 }));
write('live.json', await kit.live());
write('search.json', await kit.search({ days: 28 }));
write('indexation.json', await kit.indexation());
write('youtube.json', await kit.youtube(28));
const unconfigured = createStatsKit({ siteName: 'Empty', now: () => NOW, world: null });
write('overview-not-configured.json', await unconfigured.overview({ days: 7 }));
write('search-not-configured.json', await unconfigured.search({ days: 28 }));
write('youtube-not-configured.json', await unconfigured.youtube(28));
console.log('Examples written to packages/contract/examples/');
