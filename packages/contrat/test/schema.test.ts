import { readdirSync, readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';

const schema = JSON.parse(readFileSync(new URL('../schema/contrat.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema, 'contrat');
const kinds: Record<string, string> = { overview: 'StatsOverview', live: 'LiveResponse', search: 'SearchOverview', indexation: 'IndexationResponse', youtube: 'YoutubeOverview' };

describe('schéma JSON du contrat', () => {
  const dir = new URL('../exemples/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    it(`l’exemple ${file} respecte le schéma`, () => {
      const kind = kinds[file.replace(/(-24h|-non-configure)?\.json$/, '')];
      const validate = ajv.getSchema(`contrat#/definitions/${kind}`)!;
      const ok = validate(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }
  it('refuse une réponse incomplète', () => {
    const validate = ajv.getSchema('contrat#/definitions/LiveResponse')!;
    expect(validate({ version: 1, active: 3 })).toBe(false);
    expect(validate({ version: 2, active: 3, at: 'x' })).toBe(false);
  });
});
