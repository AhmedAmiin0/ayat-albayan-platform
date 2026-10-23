import { describe, expect, it } from 'vitest';
import type { SettingDef } from './defs.js';
import { GOOGLE_SEED_DEFS } from './google-defs.js';
import { SETTING_GROUPS } from './groups.js';
import { SETTING_KEYS, SETTINGS_REGISTRY } from './registry.js';
import { looksLikeSecretKey, REGISTRY_VERSION, SEED_ENTRIES, SEED_KEY_RE, seedEntry } from './seed-entries.js';

/** The google-sync rows (google/seed-defs.test.ts pins them to GOOGLE_SETTING_KEYS). */
const GOOGLE_KEYS = Object.keys(GOOGLE_SEED_DEFS);
const keys = SEED_ENTRIES.map((e) => e.key);
const byKey = new Map(SEED_ENTRIES.map((e) => [e.key, e]));

describe('SEED_ENTRIES (docs/26 §2b, inert until 26-P2)', () => {
  it('= the registry ∪ the three google rows, each key once', () => {
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...SETTING_KEYS, ...GOOGLE_KEYS].sort());
    expect(keys.filter((k) => k === 'comms_source')).toEqual(['comms_source']);
  });

  it('REGISTRY_VERSION is a positive integer', () => {
    expect(Number.isInteger(REGISTRY_VERSION) && REGISTRY_VERSION >= 1).toBe(true);
  });

  it('every key has the code-key format and every entry a module and a known group', () => {
    for (const e of SEED_ENTRIES) {
      expect([e.key, SEED_KEY_RE.test(e.key)]).toEqual([e.key, true]);
      expect([e.key, e.module]).toEqual([e.key, expect.stringMatching(/^[a-z][a-z_]+$/)]);
      expect([e.key, SETTING_GROUPS.includes(e.group ?? ('' as never))]).toEqual([e.key, true]);
    }
  });

  it('value_type, default_value, is_public and hintKey mirror the definition', () => {
    const defs: Record<string, SettingDef> = { ...SETTINGS_REGISTRY, ...GOOGLE_SEED_DEFS };
    for (const [key, def] of Object.entries(defs)) {
      expect(byKey.get(key)).toMatchObject({
        value_type: def.type,
        default_value: def.default,
        is_public: def.public === true,
        hintKey: def.hintKey ?? null,
        description_seed: null,
        retired: false,
      });
    }
  });

  it('google rows: module google_sync, group google, owned by google_sync, scope module, today\'s defaults', () => {
    expect(byKey.get('google_sync_enabled')).toMatchObject({ value_type: 'bool', default_value: false });
    expect(byKey.get('google_sync_mode')).toMatchObject({ value_type: 'enum', default_value: 'dry_run' });
    expect(byKey.get('google_calendar_window_days')).toMatchObject({ value_type: 'int', default_value: 60 });
    expect(GOOGLE_SEED_DEFS.google_calendar_window_days).toMatchObject({ min: 7, max: 180 });
    expect(GOOGLE_SEED_DEFS.google_sync_mode.options).toEqual(['dry_run', 'live']);
    for (const key of GOOGLE_KEYS) {
      expect(byKey.get(key)).toMatchObject({ module: 'google_sync', group: 'google', ownedBy: 'google_sync', scope: 'module', is_public: false });
    }
  });

  it('scope is module for owned keys and the «تُدار من صفحة أخرى» groups, config otherwise', () => {
    for (const e of SEED_ENTRIES) {
      const moduleScoped = e.ownedBy !== null || ['notifications', 'safety', 'google'].includes(e.group ?? '');
      expect([e.key, e.scope]).toEqual([e.key, moduleScoped ? 'module' : 'config']);
    }
    expect(byKey.get('comms_source')?.scope).toBe('module');
    expect(byKey.get('booking_horizon_weeks')?.scope).toBe('config');
  });

  it('a retired flag is carried only when set explicitly', () => {
    const def = { type: 'bool', default: false, labelKey: 'x', module: 'm', group: 'sales' } as const;
    expect(seedEntry('old_flag', def).retired).toBe(false);
    expect(seedEntry('old_flag', { ...def, retired: true }).retired).toBe(true);
  });

  it('entries are frozen: no caller can change what the seeder sends', () => {
    expect(Object.isFrozen(SEED_ENTRIES)).toBe(true);
    expect(SEED_ENTRIES.every((e) => Object.isFrozen(e))).toBe(true);
  });
});

describe('secret-looking keys (docs/26 §2a: secrets live in Vault only)', () => {
  it('the predicate catches *_token, *_secret, *_key', () => {
    for (const k of ['wa_token', 'app_secret', 'api_key']) expect([k, looksLikeSecretKey(k)]).toEqual([k, true]);
    for (const k of ['token_count', 'secretary_name', 'keyboard', 'monkey']) expect([k, looksLikeSecretKey(k)]).toEqual([k, false]);
  });

  it('no seed key looks like a secret', () => {
    expect(keys.filter(looksLikeSecretKey)).toEqual([]);
  });
});
