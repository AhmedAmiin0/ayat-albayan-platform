import { describe, expect, it } from 'vitest';
import { receivablesRoutes } from '../receivables.routes';

describe('receivablesRoutes: access', () => {
  it('carries one permission and the receivables tag on every route', () => {
    for (const { permissions, tags } of Object.values(receivablesRoutes)) {
      expect({ permissions, tags }).toEqual({ permissions: ['receivables.read'], tags: ['receivables'] });
    }
  });
});
