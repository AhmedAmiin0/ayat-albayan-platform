import { describe, expect, it } from 'vitest';
import { expenseRoutes } from '../expenses.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});

describe('expenseRoutes: access', () => {
  it('lets readers list, see the year and fetch a receipt', () => {
    const r = expenseRoutes;
    for (const route of [r.categories, r.list, r.year, r.receipt]) {
      expect(accessOf(route)).toEqual({ permissions: ['expenses.read'], tags: ['expenses'] });
    }
  });

  it('keeps every change for writers', () => {
    const r = expenseRoutes;
    for (const route of [r.addCategory, r.receiptUploadUrl, r.create, r.update, r.remove]) {
      expect(accessOf(route)).toEqual({ permissions: ['expenses.write'], tags: ['expenses'] });
    }
  });
});
