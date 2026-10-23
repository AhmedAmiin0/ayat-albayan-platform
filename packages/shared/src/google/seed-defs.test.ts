import { describe, expect, it } from 'vitest';
import { GOOGLE_SEED_DEFS } from '../settings/google-defs.js';
import { SEED_ENTRIES } from '../settings/seed-entries.js';
import { GOOGLE_SYNC_MODES, GOOGLE_WINDOW_DAYS } from './enums.js';
import { GOOGLE_SETTING_KEYS } from './settings-keys.js';

// src/settings may not import src/google (settings/boundaries.test.ts), so the google rows' seed
// definitions are written out there and pinned here, from the google side.
describe('GOOGLE_SEED_DEFS (settings seed of the google-sync rows, docs/26 §2b)', () => {
  it('names exactly the GOOGLE_SETTING_KEYS rows', () => {
    expect(Object.keys(GOOGLE_SEED_DEFS).sort()).toEqual(Object.values(GOOGLE_SETTING_KEYS).sort());
  });

  it('defaults and bounds are the google module\'s: OFF, dry_run, 60 days in 7..180', () => {
    expect(GOOGLE_SEED_DEFS[GOOGLE_SETTING_KEYS.enabled]).toMatchObject({ type: 'bool', default: false });
    expect(GOOGLE_SEED_DEFS[GOOGLE_SETTING_KEYS.mode]).toMatchObject({ type: 'enum', default: 'dry_run' });
    expect(GOOGLE_SEED_DEFS[GOOGLE_SETTING_KEYS.mode].options).toEqual([...GOOGLE_SYNC_MODES]);
    expect(GOOGLE_SEED_DEFS[GOOGLE_SETTING_KEYS.window_days]).toMatchObject({ type: 'int', ...GOOGLE_WINDOW_DAYS });
  });

  it('every google row is seeded once, as a module row owned by google_sync', () => {
    for (const key of Object.values(GOOGLE_SETTING_KEYS)) {
      const hits = SEED_ENTRIES.filter((e) => e.key === key);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({ module: 'google_sync', group: 'google', scope: 'module', ownedBy: 'google_sync' });
    }
  });
});
