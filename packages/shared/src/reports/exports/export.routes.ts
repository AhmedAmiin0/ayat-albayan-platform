import { dateRangeQuery } from '@ab/money';
import { defineRoute } from '@ab/core';
import {
  expenseExportQuerySchema,
  paymentExportQuerySchema,
  payoutExportQuerySchema,
  teacherLedgerExportQuerySchema,
} from './export.schemas';

const csv = {
  method: 'GET',
  response: 'file',
  permissions: ['exports.read'],
  tags: ['exports'],
} as const;

/**
 * CSV downloads (docs/11 §9, R-RPT-03, R-TCH-04), keyed by the file's kind. Admin only.
 * `?from&to` are Riyadh days, inclusive, at most a year (400 invalid_range, range_too_large).
 */
export const exportRoutes = {
  students: defineRoute({ ...csv, path: '/exports/students.csv' }),
  lessons: defineRoute({ ...csv, path: '/exports/lessons.csv', query: dateRangeQuery }),
  payments: defineRoute({ ...csv, path: '/exports/payments.csv', query: paymentExportQuerySchema }),
  payouts: defineRoute({ ...csv, path: '/exports/payouts.csv', query: payoutExportQuerySchema }),
  expenses: defineRoute({ ...csv, path: '/exports/expenses.csv', query: expenseExportQuerySchema }),
  'teacher-ledger': defineRoute({
    ...csv,
    path: '/exports/teacher-ledger.csv',
    query: teacherLedgerExportQuerySchema,
  }),
  receivables: defineRoute({ ...csv, path: '/exports/receivables.csv' }),
};
