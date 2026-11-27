import { describe, expect, it } from 'vitest';
import { invoiceRoutes } from '../invoices.routes';

describe('invoiceRoutes: access', () => {
  it('carries one permission and the invoices tag on every route', () => {
    for (const { permissions, tags } of Object.values(invoiceRoutes)) {
      expect({ permissions, tags }).toEqual({ permissions: ['invoices.read'], tags: ['invoices'] });
    }
  });
});
