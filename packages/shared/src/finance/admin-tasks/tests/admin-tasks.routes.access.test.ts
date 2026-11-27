import { describe, expect, it } from 'vitest';
import { adminTaskRoutes } from '../admin-tasks.routes';

describe('adminTaskRoutes: access', () => {
  it('carries one permission and the admin-tasks tag on every route', () => {
    for (const { permissions, tags } of Object.values(adminTaskRoutes)) {
      expect({ permissions, tags }).toEqual({ permissions: ['tasks.manage'], tags: ['admin-tasks'] });
    }
  });
});
