// Generates packages/contract/schema/contract.schema.json from the TypeScript types (single source of the contract).
// `node scripts/schema.mjs --check` fails if the committed schema is out of date (CI).
import { createGenerator } from 'ts-json-schema-generator';
import { readFileSync, writeFileSync } from 'node:fs';

const out = new URL('../packages/contract/schema/contract.schema.json', import.meta.url);
const schema = createGenerator({ path: 'packages/contract/src/types.ts', tsconfig: 'tsconfig.json', type: 'Contract', expose: 'export', topRef: true, jsDoc: 'extended', additionalProperties: false, skipTypeCheck: true }).createSchema('Contract');
schema.$id = 'stats-kit/contract.schema.json';
schema.title = 'stats-kit data contract (version 1)';
const text = JSON.stringify(schema, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const current = readFileSync(out, 'utf8').replace(/\r\n/g, '\n');
  if (current !== text) {
    console.error('The JSON schema is out of date: run "npm run schema".');
    process.exit(1);
  }
  console.log('JSON schema up to date.');
} else {
  writeFileSync(out, text);
  console.log('Schema written:', out.pathname);
}
