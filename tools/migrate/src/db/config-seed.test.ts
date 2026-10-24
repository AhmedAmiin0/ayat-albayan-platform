import { REGISTRY_VERSION, SEED_ENTRIES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { configSeedSql, seedConfig } from './config-seed.ts';

describe('migrate:apply config seed (docs/26 §2b)', () => {
  it('sends the registry payload and version to config_seed, with no value field', () => {
    const q = configSeedSql();
    expect(q.text).toBe('select public.config_seed($1::text::jsonb, $2::int) as r');
    const rows = JSON.parse(q.params[0]) as Record<string, unknown>[];
    expect(rows.map((r) => r['key'])).toEqual(SEED_ENTRIES.map((e) => e.key));
    for (const r of rows) expect(r).not.toHaveProperty('value');
    expect(q.params[1]).toBe(REGISTRY_VERSION);
  });

  it('reports the answer, and a failure never throws', async () => {
    const ok = { select: () => Promise.resolve([{ r: { applied: 0, failed: [] } }]) } as never;
    expect(await seedConfig(ok)).toBe('{"applied":0,"failed":[]}');
    const bad = { select: () => Promise.reject(new Error('no rpc')) } as never;
    expect(await seedConfig(bad)).toBe('failed (no rpc)');
  });
});
