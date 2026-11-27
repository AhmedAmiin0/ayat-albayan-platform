import { describe, expect, it } from 'vitest';
import { customConfigRoutes as routes } from '..';

const VIEW = {
  key: 'promo',
  value: { text: 'hi' },
  description: null,
  isPublic: true,
  updatedAt: '2026-10-05T00:00:00.123456+00:00',
  updatedBy: 'a0000000-0000-4000-8000-000000000001',
};

describe('customConfigRoutes', () => {
  it('keeps the paths, tag and permissions of today', () => {
    const lines = Object.values(routes).map(
      (r) => `${r.method} ${r.path} ${r.permissions.join()} ${r.tags.join()}`,
    );
    expect(lines).toEqual([
      'GET /config/custom settings.read config',
      'PUT /config/custom/:key settings.write config',
      'DELETE /config/custom/:key settings.write config',
    ]);
  });

  it('answers every entry with its JSON value and who saved it', () => {
    const unsigned = { ...VIEW, value: 3, updatedBy: null };
    expect(routes.list.response.parse([VIEW, unsigned])).toEqual([VIEW, unsigned]);
    expect(routes.put.response.parse(VIEW)).toEqual(VIEW);
  });

  it('refuses a time without offset, a saver that is not an id and a missing flag', () => {
    const bad = [
      { ...VIEW, updatedAt: '2026-10-05 00:00' },
      { ...VIEW, updatedBy: 'someone' },
      { ...VIEW, isPublic: undefined },
    ];
    for (const view of bad) expect(routes.list.response.safeParse([view]).success).toBe(false);
  });

  it('takes a custom key in the path and refuses a bad or reserved one', () => {
    expect(routes.put.params.parse({ key: 'promo.banner' })).toEqual({ key: 'promo.banner' });
    expect(routes.put.params.safeParse({ key: 'Bad-Key' }).success).toBe(false);
    expect(routes.remove.params.safeParse({ key: 'messaging_enabled' }).success).toBe(false);
  });

  it('saves a value that is not null, private unless told', () => {
    expect(routes.put.body.parse({ value: 'hi' })).toEqual({ value: 'hi', isPublic: false });
    expect(routes.put.body.safeParse({ value: null }).success).toBe(false);
  });
});
