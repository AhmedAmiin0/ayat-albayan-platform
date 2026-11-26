import { defineRoute } from '@ab/core';
import { expenseCategoryCreateSchema, expenseCategoryViewSchema } from '@ab/money';
import { z } from 'zod';

/** Expenses and their categories (R-RPT-02), written once for the api and its clients. */
export const expenseRoutes = {
  categories: defineRoute({
    method: 'GET',
    path: '/expense-categories',
    response: z.array(expenseCategoryViewSchema),
  }),
  addCategory: defineRoute({
    method: 'POST',
    path: '/expense-categories',
    body: expenseCategoryCreateSchema,
    response: expenseCategoryViewSchema,
  }),
};
