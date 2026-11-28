import { defineRoute } from '@ab/core';
import { salesFamilyQuerySchema } from './money';
import { salesFamilyViewSchema } from './money-family.schemas';

/** Her students in this chat's family (every child with sales.renew_any), docs/16 rows 16–19. */
export const salesMoneyFamilyRoutes = {
  family: defineRoute({
    permissions: ['self.sales_money'],
    tags: ['sales'],
    method: 'GET',
    path: '/sales/money/family',
    query: salesFamilyQuerySchema,
    response: salesFamilyViewSchema,
  }),
};
