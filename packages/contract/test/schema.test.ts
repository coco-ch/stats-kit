import { readdirSync, readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';

const schema = JSON.parse(readFileSync(new URL('../schema/contract.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema, 'contract');
const kinds: Record<string, string> = { overview: 'StatsOverview', live: 'LiveResponse', search: 'SearchOverview', indexation: 'IndexationResponse', youtube: 'YoutubeOverview' };

describe('JSON schema of the contract', () => {
  const dir = new URL('../examples/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    it(`example ${file} matches the schema`, () => {
      const kind = kinds[file.replace(/(-24h|-not-configured)?\.json$/, '')];
      const validate = ajv.getSchema(`contract#/definitions/${kind}`)!;
      const ok = validate(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }
  it('rejects an incomplete response', () => {
    const validate = ajv.getSchema('contract#/definitions/LiveResponse')!;
    expect(validate({ version: 1, active: 3 })).toBe(false);
    expect(validate({ version: 2, active: 3, at: 'x' })).toBe(false);
  });
});
