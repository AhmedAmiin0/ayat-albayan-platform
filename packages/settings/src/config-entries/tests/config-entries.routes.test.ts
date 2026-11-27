import { describe, expect, it } from 'vitest';
import { SETTING_KEYS, settingDef } from '../../registry';
import { configEntriesRoutes as routes, settingTypeSchema } from '..';

const ENTRY = {
  key: 'makeup_window_days',
  module: 'schedule',
  group: 'schedule',
  type: 'int',
  bounds: { min: 0, max: 30 },
  value: 7,
  defaultValue: 7,
  stored: true,
  description: null,
  descriptionSeed: 'نص',
  descriptionEdited: false,
  hintKey: 'settings.hint.makeup',
  labelKey: 'settings.label.makeup',
  public: false,
  version: 3,
  updatedAt: '2026-10-05T00:00:00.123456+00:00',
  updatedByName: 'admin',
  ownedBy: null,
  confirm: null,
  retired: false,
};

describe('configEntriesRoutes', () => {
  it('keeps the paths, tag and permissions of today', () => {
    const lines = Object.values(routes).map(
      (r) => `${r.method} ${r.path} ${r.permissions.join()} ${r.tags.join()}`,
    );
    expect(lines).toEqual([
      'GET /config/entries settings.read config',
      'PATCH /config/entries/:key settings.write config',
      'PUT /config/entries/:key/description settings.write config',
    ]);
  });

  it('answers the rows, an unwritten one included, and the row after a write', () => {
    const missing = { ...ENTRY, version: 0, stored: false, updatedAt: null, updatedByName: null };
    const owned = { ...ENTRY, group: 'google', ownedBy: 'google_sync', confirm: 'typed' };
    const entries = [ENTRY, missing, owned];
    expect(routes.list.response.parse({ entries })).toEqual({ entries });
    expect(routes.patch.response.parse({ entry: ENTRY })).toEqual({ entry: ENTRY });
    expect(routes.describe.response.parse({ entry: ENTRY })).toEqual({ entry: ENTRY });
  });

  it('refuses a time without offset, an unknown group, owner or type and a negative version', () => {
    const bad = [
      { updatedAt: '2026-10-05 00:00' },
      { group: 'misc' },
      { ownedBy: 'someone' },
      { type: 'float' },
      { version: -1 },
    ];
    for (const part of bad) {
      expect(routes.list.response.safeParse({ entries: [{ ...ENTRY, ...part }] }).success).toBe(
        false,
      );
    }
  });

  it('names every type of the registry', () => {
    const types = SETTING_KEYS.map((key) => settingDef(key).type);
    for (const type of types) expect(settingTypeSchema.parse(type)).toBe(type);
  });

  it('takes a versioned value and a trimmed description or null', () => {
    const patch = { value: null, expectedVersion: 0 };
    expect(routes.patch.body.parse(patch)).toEqual(patch);
    expect(routes.patch.body.safeParse({ value: 1, expectedVersion: -1 }).success).toBe(false);
    expect(routes.describe.body.parse({ text: '  نص  ' })).toEqual({ text: 'نص' });
    expect(routes.describe.body.parse({ text: null })).toEqual({ text: null });
    expect(routes.describe.body.safeParse({ text: '   ' }).success).toBe(false);
    expect(routes.describe.params.parse({ key: 'any_key' })).toEqual({ key: 'any_key' });
  });
});
