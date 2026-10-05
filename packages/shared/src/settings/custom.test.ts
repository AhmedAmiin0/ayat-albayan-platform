import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_KEYS } from './public.js';
import { SETTING_DEFAULTS, SETTING_KEYS } from './registry.js';
import { buildPublicConfig, CUSTOM_VALUE_MAX_BYTES, customConfigUpsertSchema, customKeySchema } from './custom.js';

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

describe('public /config whitelist', () => {
  const all = { ...SETTING_DEFAULTS, messaging_enabled: true, late_cancel_hours: 6, academy_contact: { site: 'x.org' } };
  const custom = [
    { key: 'promo', value: 'hi', is_public: true },
    { key: 'internal.note', value: 'private', is_public: false },
    { key: 'messaging_enabled', value: 'shadow', is_public: true },
  ];

  it('returns the public settings and the public custom entries, nothing else', () => {
    const out = buildPublicConfig(all, custom);
    expect(Object.keys(out.settings).sort()).toEqual([...PUBLIC_SETTING_KEYS].sort());
    expect(out.settings).toMatchObject({ academy_contact: { site: 'x.org' }, recording_consent_notice: null });
    expect(out.custom).toEqual({ promo: 'hi' });
  });

  it('never leaks a non-public key, in any form', () => {
    const text = JSON.stringify(buildPublicConfig(all, custom));
    for (const leak of ['messaging_enabled', 'late_cancel_hours', 'internal.note', 'private', 'shadow', 'crm_cutover_done', 'follow_up_hours']) {
      expect(text).not.toContain(leak);
    }
  });

  it('every registry key is either public (returned) or hidden: the whitelist is the registry flag', () => {
    const out = buildPublicConfig(all, []);
    for (const k of SETTING_KEYS) expect(k in out.settings).toBe((PUBLIC_SETTING_KEYS as string[]).includes(k));
  });
});
