import { describe, expect, it } from 'vitest';
import { settingsMetaRoutes as routes } from '..';

const ENTRY = {
  updatedAt: '2026-11-27T10:00:00+00:00',
  updatedBy: 'a0000000-0000-4000-8000-000000000001',
  updatedByName: 'Mona',
};

describe('settingsMetaRoutes', () => {
  it('keeps the path, tag and permission of today', () => {
    expect(routes.view).toMatchObject({
      method: 'GET',
      path: '/config/meta',
      permissions: ['settings.read'],
      tags: ['config'],
    });
  });

  it('answers who changed each stored row, or no one named', () => {
    const answer = {
      meta: { a: ENTRY, b: { ...ENTRY, updatedBy: null, updatedByName: null } },
    };
    expect(routes.view.response.parse(answer)).toEqual(answer);
    expect(routes.view.response.parse({ meta: {} })).toEqual({ meta: {} });
  });

  it('refuses a change time without its offset and a writer that is no id', () => {
    const at = { meta: { a: { ...ENTRY, updatedAt: '2026-11-27 10:00' } } };
    expect(routes.view.response.safeParse(at).success).toBe(false);
    const by = { meta: { a: { ...ENTRY, updatedBy: 'someone' } } };
    expect(routes.view.response.safeParse(by).success).toBe(false);
  });
});
