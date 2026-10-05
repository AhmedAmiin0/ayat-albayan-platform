import { describe, expect, it } from 'vitest';
import { publicCustom, CUSTOM_VALUE_MAX_BYTES, customConfigUpsertSchema, customKeySchema } from './custom.js';

describe('custom entry validation', () => {
  it.each(['promo.banner', 'a1', 'site-name', 'x_y.z-9'])('accepts the key %s', (k) => {
    expect(customKeySchema.safeParse(k).success).toBe(true);
  });

  it.each(['A', '1a', 'a', 'Banner', 'has space', 'x'.repeat(65), 'a/b', 'messaging_enabled', 'academy_contact'])(
    'rejects the key %s (shape, length or reserved by the registry)',
    (k) => {
      expect(customKeySchema.safeParse(k).success).toBe(false);
    },
  );

  it('takes any JSON value except null, private by default', () => {
    const parsed = customConfigUpsertSchema.parse({ value: { a: [1, 'x'] } });
    expect(parsed).toEqual({ value: { a: [1, 'x'] }, isPublic: false });
    expect(customConfigUpsertSchema.safeParse({ value: null }).success).toBe(false);
    expect(customConfigUpsertSchema.safeParse({}).success).toBe(false);
  });

  it('limits the value to 8 KB of UTF-8, counting bytes not characters', () => {
    const fits = 'a'.repeat(CUSTOM_VALUE_MAX_BYTES - 2);
    expect(customConfigUpsertSchema.safeParse({ value: fits }).success).toBe(true);
    expect(customConfigUpsertSchema.safeParse({ value: `${fits}a` }).success).toBe(false);
    const arabic = 'ب'.repeat(CUSTOM_VALUE_MAX_BYTES / 2);
    expect(customConfigUpsertSchema.safeParse({ value: arabic }).success).toBe(false);
  });
});

describe('public custom entries (GET /settings/public)', () => {
  const rows = [
    { key: 'promo', value: 'hi', is_public: true },
    { key: 'internal.note', value: 'private', is_public: false },
    { key: 'messaging_enabled', value: 'shadow', is_public: true },
  ];

  it('keeps only the rows flagged public that do not shadow a setting', () => {
    expect(publicCustom(rows)).toEqual({ promo: 'hi' });
    expect(publicCustom([])).toEqual({});
  });

  it('never leaks a private row or a setting key, in any form', () => {
    const text = JSON.stringify(publicCustom(rows));
    for (const leak of ['messaging_enabled', 'internal.note', 'private', 'shadow']) expect(text).not.toContain(leak);
  });
});
