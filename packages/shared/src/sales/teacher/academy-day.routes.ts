import { defineRoute } from '@ab/core';
import { assistantLessonViewSchema } from '@ab/schedule';
import { z } from 'zod';
import { salesScheduleDaySchema, salesScheduleQuerySchema } from './academy-day.schemas';

const ACCESS = { permissions: ['self.sales_academy'], tags: ['sales'] } as const;

/** The academy as a salesperson reads it (docs/16): read-only, no note or money. */
export const salesAcademyDayRoutes = {
  /** One Riyadh day of lessons with their way in, `mine` on her own students. */
  day: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/schedule',
    query: salesScheduleQuerySchema,
    response: salesScheduleDaySchema,
  }),
  /** The lessons running now across the academy, without their link. */
  live: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/live',
    response: z.array(assistantLessonViewSchema),
  }),
};
