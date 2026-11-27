import { defineRoute, pageOf, pageQuery } from '@ab/core';
import { z } from 'zod';
import { teacherReportsQuerySchema } from '../teacher-list';
import {
  pendingReportViewSchema,
  studentReportsResponseSchema,
  teacherReportViewSchema,
} from './report-history.schemas';

const tags = ['reports'] as const;
const mineOnly = { permissions: ['self.teacher'], tags } as const;

/** docs/11 §4 R5, R11: the static teachers/me segment wins over teachers/:id. */
export const reportHistoryRoutes = {
  /** Admin; a teacher only for a student they teach or taught (403 otherwise). */
  student: defineRoute({
    method: 'GET',
    path: '/students/:id/reports',
    params: z.object({ id: z.uuid() }),
    query: z.object(pageQuery({ size: 25 })),
    response: studentReportsResponseSchema,
    permissions: ['reports.read'],
    tags,
  }),
  /** Oldest lesson first. */
  pending: defineRoute({
    method: 'GET',
    path: '/teachers/me/pending-reports',
    response: z.array(pendingReportViewSchema),
    ...mineOnly,
  }),
  /** Newest submit first; drafts and missing reports stay in pending. */
  mine: defineRoute({
    method: 'GET',
    path: '/teachers/me/reports',
    query: teacherReportsQuerySchema.extend(pageQuery({ size: 25 })),
    response: pageOf(teacherReportViewSchema),
    ...mineOnly,
  }),
};
