import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { lessonViewSchema } from '../lesson-view';
import {
  lessonDayQuerySchema,
  lessonWindowQuerySchema,
  scheduleOverviewSchema,
} from './lesson-lists.schemas';

const lessons = z.array(lessonViewSchema);
const reads = { permissions: ['lessons.read'], tags: ['lessons'] } as const;

/** Admin lists across teachers (docs/10 routes 1, 2): every status, by starts_at (R-SCH-01). */
export const lessonListRoutes = {
  /** The week view; 400 range_too_large past 31 days. */
  list: defineRoute({
    method: 'GET',
    path: '/lessons',
    query: lessonWindowQuerySchema,
    response: lessons,
    ...reads,
  }),
  /** One local day in `tz` (default settings.academy_timezone). */
  day: defineRoute({
    method: 'GET',
    path: '/lessons/day',
    query: lessonDayQuerySchema,
    response: lessons,
    ...reads,
  }),
  /** The all-teachers calendar (R-SCH-09), on the week view's window and cap. */
  overview: defineRoute({
    method: 'GET',
    path: '/lessons/overview',
    query: lessonWindowQuerySchema,
    response: scheduleOverviewSchema,
    ...reads,
  }),
};
