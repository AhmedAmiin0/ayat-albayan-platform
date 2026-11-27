import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_DEFAULTS } from '../../public';
import { publicConfigRoutes as routes } from '..';
import { PUBLIC_CONFIG_PATH } from '../public-config';

describe('publicConfigRoutes', () => {
  it('keeps the path and tag of today and asks no permission', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path} ${r.tags.join()}`);
    expect(lines).toEqual(['GET /settings/public settings']);
    expect(routes.get.path).toBe(PUBLIC_CONFIG_PATH);
    expect('permissions' in routes.get).toBe(false);
  });

  it('answers the public settings and the public custom values', () => {
    const answer = { ...PUBLIC_SETTING_DEFAULTS, upload_max_mb: 3, custom: { promo: 'hi' } };
    expect(routes.get.response.parse(answer)).toEqual(answer);
  });

  it('reads an odd value as its default and fails only without a body', () => {
    const defaults = { ...PUBLIC_SETTING_DEFAULTS, custom: {} };
    expect(routes.get.response.parse({ upload_max_mb: 'ten' })).toEqual(defaults);
    expect(routes.get.response.safeParse(undefined).success).toBe(false);
  });
});
