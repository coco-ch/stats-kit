// Génère packages/contrat/schema/contrat.schema.json à partir des types TypeScript (source unique du contrat).
// `node scripts/schema.mjs --check` échoue si le schéma commité n'est plus à jour (CI).
import { createGenerator } from 'ts-json-schema-generator';
import { readFileSync, writeFileSync } from 'node:fs';

const out = new URL('../packages/contrat/schema/contrat.schema.json', import.meta.url);
const schema = createGenerator({ path: 'packages/contrat/src/types.ts', tsconfig: 'tsconfig.json', type: 'Contract', expose: 'export', topRef: true, jsDoc: 'extended', additionalProperties: false, skipTypeCheck: true }).createSchema('Contract');
schema.$id = 'stats-kit/contrat.schema.json';
schema.title = 'Contrat de données de stats-kit (version 1)';
const text = JSON.stringify(schema, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const current = readFileSync(out, 'utf8').replace(/\r\n/g, '\n');
  if (current !== text) {
    console.error('Le schéma JSON n’est plus à jour : lancez « npm run schema ».');
    process.exit(1);
  }
  console.log('Schéma JSON à jour.');
} else {
  writeFileSync(out, text);
  console.log('Schéma écrit :', out.pathname);
}
