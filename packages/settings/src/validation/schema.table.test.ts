import { describe, expect, it } from 'vitest';
import { byType, type SettingDef, type SettingTypeTable } from '../defs.js';
import { SETTING_KEYS, settingDef } from '../registry.js';
import { settingZod } from './schema.js';

const base = { labelKey: 'x' };

describe('byType (the per-type tables)', () => {
  const table: SettingTypeTable<string> = {
    int: (def) => `int ${def.min}-${def.max}`,
    bool: () => 'bool',
    string: (def) => `string ${def.maxLength}`,
    e164: () => 'e164',
    tz: () => 'tz',
    currency: () => 'currency',
    int_list: (def) => `list ${def.maxItems}`,
    enum: (def) => `enum ${def.options.join('|')}`,
    json: (def) => `json ${def.shape.length}`,
  };

  it.each([
    [{ ...base, type: 'int', default: 1, min: 1, max: 9 }, 'int 1-9'],
    [{ ...base, type: 'bool', default: true }, 'bool'],
    [{ ...base, type: 'string', default: 'a', minLength: 1, maxLength: 60 }, 'string 60'],
    [{ ...base, type: 'tz', default: 'Africa/Cairo' }, 'tz'],
    [{ ...base, type: 'int_list', default: [1], min: 1, max: 9, maxItems: 3 }, 'list 3'],
    [{ ...base, type: 'enum', default: 'a', options: ['a', 'b'] }, 'enum a|b'],
    [{ ...base, type: 'json', default: null, shape: [{ name: 'a', kind: 'string' }] }, 'json 1'],
  ] as [SettingDef, string][])('%j → %s', (def, out) => {
    expect(byType(table, def)).toBe(out);
  });
});

describe('SETTING_ZOD (one PATCH field per type)', () => {
  it('builds a schema for every registry entry', () => {
    for (const key of SETTING_KEYS)
      expect(settingZod(settingDef(key)).safeParse).toBeTypeOf('function');
  });

  it('nullable int and json accept null; the plain ones do not', () => {
    const int = { ...base, type: 'int', default: 1, min: 1, max: 9 } as const;
    expect(settingZod({ ...int, nullable: true }).safeParse(null).success).toBe(true);
    expect(settingZod(int).safeParse(null).success).toBe(false);
    const json = {
      ...base,
      type: 'json',
      default: null,
      shape: [{ name: 'a', kind: 'string' }],
    } as const;
    expect(settingZod({ ...json, nullable: true }).safeParse(null).success).toBe(true);
    expect(settingZod(json).safeParse(null).success).toBe(false);
  });

  it('currency is three capitals; int_list keeps «not_ascending»', () => {
    expect(settingZod({ ...base, type: 'currency', default: 'SAR' }).safeParse('sar').success).toBe(
      false,
    );
    const list = { ...base, type: 'int_list', default: [1], min: 1, max: 99, maxItems: 3 } as const;
    const bad = settingZod(list).safeParse([24, 12]);
    expect(bad.success ? '' : bad.error.issues[0]?.message).toBe('not_ascending');
  });
});
