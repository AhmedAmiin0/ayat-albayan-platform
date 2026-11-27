import { defineRoute, id } from '@ab/core';
import {
  expenseCategoryCreateSchema,
  expenseCategoryViewSchema,
  expenseCreateSchema,
  expenseListQuery,
  expenseReceiptUploadSchema,
  expenseUpdateSchema,
  expenseViewSchema,
  expenseYearQuery,
  expenseYearViewSchema,
} from '@ab/money';
import { z } from 'zod';
import { signedDownloadSchema, signedUploadSchema } from '../../reports';

const byId = z.object({ id: id() });

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
  list: defineRoute({
    method: 'GET',
    path: '/expenses',
    query: expenseListQuery,
    response: z.array(expenseViewSchema),
  }),
  year: defineRoute({
    method: 'GET',
    path: '/expenses/year',
    query: expenseYearQuery,
    response: expenseYearViewSchema,
  }),
  receiptUploadUrl: defineRoute({
    method: 'POST',
    path: '/expenses/receipt-upload-url',
    body: expenseReceiptUploadSchema,
    response: signedUploadSchema,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/expenses',
    body: expenseCreateSchema,
    response: expenseViewSchema,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/expenses/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/expenses/:id',
    params: byId,
    body: expenseUpdateSchema,
    response: expenseViewSchema,
  }),
  remove: defineRoute({ method: 'DELETE', path: '/expenses/:id', params: byId, response: 'empty' }),
};
