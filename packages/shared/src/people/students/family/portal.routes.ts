import { defineRoute } from '@ab/core';
import { roomJoinResultSchema } from '@ab/schedule';
import { z } from 'zod';
import {
  portalFileUrlSchema,
  portalHomeSchema,
  portalLessonsSchema,
  portalReportsSchema,
  portalRoomLinkSchema,
} from '../portal';
import {
  portalHistoryQuerySchema,
  portalHistorySchema,
  portalPackageViewSchema,
} from '../portal-family';

const student = '/portal/students/:id';
const byStudent = z.object({ id: z.uuid() });
const access = { permissions: ['self.portal'], tags: ['portal'] } as const;

/**
 * The family portal's reads and signed links (docs/31, docs/50), written once for the api and its
 * clients. The api scopes `:id` to the login's own students and answers 404 for any other.
 */
export const portalRoutes = {
  home: defineRoute({ method: 'GET', path: '/portal/me', response: portalHomeSchema, ...access }),
  lessons: defineRoute({
    method: 'GET',
    path: `${student}/lessons`,
    params: byStudent,
    response: portalLessonsSchema,
    ...access,
  }),
  /** docs/50 §5: a keyset page of past lessons, newest first. */
  history: defineRoute({
    method: 'GET',
    path: `${student}/history`,
    params: byStudent,
    query: portalHistoryQuerySchema,
    response: portalHistorySchema,
    ...access,
  }),
  /** A guest in our classroom, inside the window only: 403 before it, 410 after, 503. */
  join: defineRoute({
    method: 'POST',
    path: `${student}/lessons/:lessonId/join`,
    params: byStudent.extend({ lessonId: z.uuid() }),
    response: roomJoinResultSchema,
    ...access,
  }),
  /** A signed link with no second sign-in, until the room closes. */
  roomLink: defineRoute({
    method: 'POST',
    path: `${student}/lessons/:lessonId/room-link`,
    params: byStudent.extend({ lessonId: z.uuid() }),
    response: portalRoomLinkSchema,
    ...access,
  }),
  reports: defineRoute({
    method: 'GET',
    path: `${student}/reports`,
    params: byStudent,
    response: portalReportsSchema,
    ...access,
  }),
  /** A sent report's PDF, signed for 5 minutes. */
  reportUrl: defineRoute({
    method: 'POST',
    path: `${student}/reports/:reportId/url`,
    params: byStudent.extend({ reportId: z.uuid() }),
    response: portalFileUrlSchema,
    ...access,
  }),
  /** A recording staff made visible, signed for an hour. */
  recordingUrl: defineRoute({
    method: 'POST',
    path: `${student}/recordings/:recordingId/url`,
    params: byStudent.extend({ recordingId: z.uuid() }),
    response: portalFileUrlSchema,
    ...access,
  }),
  /** 403 package_guardian_only for a child's own login. */
  package: defineRoute({
    method: 'GET',
    path: `${student}/package`,
    params: byStudent,
    response: portalPackageViewSchema,
    ...access,
  }),
};
