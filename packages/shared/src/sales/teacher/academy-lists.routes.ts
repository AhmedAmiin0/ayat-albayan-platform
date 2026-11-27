import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { salesSubscriptionHistorySchema, salesTeacherViewSchema } from './academy-lists.schemas';

/** The teachers and a subscription's history as a salesperson reads them (docs/16). */
export const salesAcademyListRoutes = {
  /** Every active teacher with the students they teach. */
  teachers: defineRoute({
    permissions: ['self.sales_academy'],
    tags: ['sales'],
    method: 'GET',
    path: '/sales/teachers',
    response: z.array(salesTeacherViewSchema),
  }),
  /** Any subscription and its student's whole history; 404 subscription_not_found. */
  history: defineRoute({
    permissions: ['self.sales'],
    tags: ['sales'],
    method: 'GET',
    path: '/sales/subscriptions/:id/history',
    params: z.object({ id: id() }),
    response: salesSubscriptionHistorySchema,
  }),
};
