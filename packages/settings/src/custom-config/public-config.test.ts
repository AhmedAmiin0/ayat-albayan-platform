import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  PUBLIC_CONFIG_PATH,
  PUBLIC_CONFIG_QUERY_KEY,
  PUBLIC_CONFIG_STALE_MS,
  withPublicDefaults,
  type PublicConfig,
} from './public-config.js';
import { PUBLIC_SETTING_DEFAULTS, type PublicSettings } from '../public.js';

describe('public config (GET /settings/public)', () => {
  it('the clients share one path, query key and stale time', () => {
    expect(PUBLIC_CONFIG_PATH).toBe('/settings/public');
    expect(PUBLIC_CONFIG_QUERY_KEY).toEqual(['settings', 'public']);
    expect(PUBLIC_CONFIG_STALE_MS).toBe(5 * 60_000);
  });

  it('before the API answers, the registry defaults stand in', () => {
    expect(withPublicDefaults(undefined)).toEqual(PUBLIC_SETTING_DEFAULTS);
  });

  it('the answer wins key by key over the defaults', () => {
    const data: PublicConfig = { ...PUBLIC_SETTING_DEFAULTS, makeup_window_days: 30, meeting_link_auto: true, custom: { promo: 'hi' } };
    const s = withPublicDefaults(data);
    expect(s).toMatchObject({ makeup_window_days: 30, meeting_link_auto: true, upload_max_mb: 10 });
    expect(s.join_opens_before_min).toBe(PUBLIC_SETTING_DEFAULTS.join_opens_before_min);
  });

  it('PublicConfig is the public settings plus the public custom values', () => {
    expectTypeOf<Omit<PublicConfig, 'custom'>>().toEqualTypeOf<Omit<PublicSettings, never>>();
    expectTypeOf<PublicConfig['custom']>().toExtend<Record<string, unknown>>();
  });
});
