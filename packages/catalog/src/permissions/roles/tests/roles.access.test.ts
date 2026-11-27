import { describe, expect, it } from 'vitest';
import { roleRoutes } from '../roles.routes';

describe('role route objects carry the access the api checks today', () => {
  it('lets in only roles.manage and tags every route roles', () => {
    const access = Object.values(roleRoutes).map(({ permissions, tags }) => ({ permissions, tags }));
    expect(new Set(access.map((a) => JSON.stringify(a)))).toEqual(
      new Set([JSON.stringify({ permissions: ['roles.manage'], tags: ['roles'] })]),
    );
  });
});
