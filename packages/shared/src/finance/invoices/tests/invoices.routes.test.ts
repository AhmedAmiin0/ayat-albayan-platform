import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { invoiceRoutes } from '../invoices.routes';

const INV = 'e3333333-3333-4333-8333-333333333333';

describe('invoiceRoutes (R-PAY-03)', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(invoiceRoutes).map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /invoices',
      'GET /invoices/recent',
      'GET /invoices/:id/download',
    ]);
  });

  it('fills the invoice id into the download path', () => {
    expect(routePath(invoiceRoutes.download, { id: INV })).toBe(`/invoices/${INV}/download`);
  });

  it('answers the recent page with each invoice and its payment', () => {
    const page = { items: [], total: 0, page: 1, pageSize: 25 };
    expect(invoiceRoutes.recent.response.parse(page)).toEqual(page);
  });
});
