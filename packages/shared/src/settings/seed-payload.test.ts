import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { SEED_ENTRIES } from './seed-entries.js';
import { seedPayload } from './seed-payload.js';

const lookup = (path: string): string | null => {
  const hit = path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], ar);
  return typeof hit === 'string' ? hit : null;
};

describe('seedPayload (config_seed entries, docs/26 §2b)', () => {
  const payload = seedPayload(lookup);

  it('sends one row per SEED_ENTRIES key and never a value', () => {
    expect(payload.map((r) => r.key)).toEqual(SEED_ENTRIES.map((e) => e.key));
    for (const row of payload) expect(Object.keys(row)).not.toContain('value');
  });

  it('seeds the Arabic hint of every entry that has one, ≤ 500 characters', () => {
    for (const e of SEED_ENTRIES.filter((x) => x.hintKey)) {
      const row = payload.find((r) => r.key === e.key);
      expect(row?.description_seed, e.key).toBeTruthy();
      expect(row?.description_seed?.length ?? 0).toBeLessThanOrEqual(500);
    }
  });

  it('has no seed without a hint key, and a blank text is null', () => {
    const noHint = SEED_ENTRIES.filter((e) => !e.hintKey).map((e) => e.key);
    for (const key of noHint) expect(payload.find((r) => r.key === key)?.description_seed).toBeNull();
    const [first] = seedPayload(() => '  ', SEED_ENTRIES.filter((e) => e.hintKey));
    expect(first?.description_seed).toBeNull();
  });
});
