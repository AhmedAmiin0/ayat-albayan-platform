import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_DEFAULTS } from '../public';
import { publicConfigSchema } from './public-config-schema';

const defaults = { ...PUBLIC_SETTING_DEFAULTS, custom: {} };

describe('GET /settings/public as the apps read it', () => {
  it('keeps the answer and its public custom values', () => {
    const body = { ...PUBLIC_SETTING_DEFAULTS, family_chat_enabled: true, upload_max_mb: 3 };
    const answer = { ...body, custom: { promo: 'hi' } };
    expect(publicConfigSchema.parse(answer)).toEqual(answer);
  });

  it('a missing or odd value reads as its default; one never fails the answer', () => {
    const parsed = publicConfigSchema.parse({ upload_max_mb: 'ten', custom: 7 });
    expect(parsed).toEqual(defaults);
    // No custom key at all (an older API): an empty object, never a missing key.
    expect(publicConfigSchema.parse({ upload_max_mb: 'ten' })).toEqual(defaults);
  });

  it('a body that is not an object reads as the defaults; no body at all fails', () => {
    expect(publicConfigSchema.parse(null)).toEqual(defaults);
    expect(publicConfigSchema.parse(['x'])).toEqual(defaults);
    expect(publicConfigSchema.parse('<html>')).toEqual(defaults);
    expect(publicConfigSchema.safeParse(undefined).success).toBe(false);
  });
});
