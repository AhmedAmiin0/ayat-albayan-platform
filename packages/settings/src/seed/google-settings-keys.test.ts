import { describe, expect, expectTypeOf, it } from 'vitest';
import { isSettingKey, SETTING_KEYS } from '../registry.js';
import { GOOGLE_SETTING_KEYS, type GoogleSettingKey } from '@ab/catalog';

// Vite's raw import (vitest): the shared lib has no Node typings, so the migration is read this way.
declare global {
  interface ImportMeta {
    glob<T>(pattern: string | string[], options: { query: '?raw'; import: 'default'; eager: true }): Record<string, T>;
  }
}

const migration = Object.values(
  import.meta.glob<string>('../../../db/supabase/migrations/20261022000610_google_sync.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).join('\n');

describe('GOOGLE_SETTING_KEYS', () => {
  it('names the three rows migration 20261022000610 seeds', () => {
    expect(migration).toContain('insert into public.settings (key, value) values');
    const seeded = [...migration.matchAll(/\('(google_[a-z_]+)', '[^']*'::jsonb\)/g)].map((m) => m[1]);
    expect(seeded.sort()).toEqual(Object.values(GOOGLE_SETTING_KEYS).sort());
  });

  it('never overlaps the settings registry (GET /settings does not list them)', () => {
    for (const key of Object.values(GOOGLE_SETTING_KEYS)) expect([key, isSettingKey(key)]).toEqual([key, false]);
    expect(SETTING_KEYS.filter((k) => k.startsWith('google_'))).toEqual([]);
  });

  it('GoogleSettingKey is the union of the three row keys', () => {
    expectTypeOf<GoogleSettingKey>().toEqualTypeOf<'google_sync_enabled' | 'google_sync_mode' | 'google_calendar_window_days'>();
  });
});
