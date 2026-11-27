import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { portalFileUrlSchema } from '../../people/students';
import { signedDownloadSchema, signedUploadSchema } from '../page-access';
import {
  lessonAssetsSchema,
  portalLessonAssetsSchema,
  portalLessonFileUrlQuerySchema,
  portalRecordingsSchema,
} from './lesson-assets';
import {
  lessonFileRegisterSchema,
  lessonFileUploadSchema,
  lessonFileViewSchema,
  lessonFileVisibilitySchema,
} from './lesson-files';

const byId = z.object({ id: z.uuid() });

/** A lesson's files for staff (recordings.read to look, recordings.manage to change). */
export const lessonFilesRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/lessons/:id/files',
    params: byId,
    response: lessonAssetsSchema,
  }),
  uploadUrl: defineRoute({
    method: 'POST',
    path: '/lessons/:id/files/upload-url',
    params: byId,
    body: lessonFileUploadSchema,
    response: signedUploadSchema,
  }),
  register: defineRoute({
    method: 'POST',
    path: '/lessons/:id/files',
    params: byId,
    body: lessonFileRegisterSchema,
    response: lessonFileViewSchema,
  }),
  visibility: defineRoute({
    method: 'PATCH',
    path: '/lesson-files/:id/visibility',
    params: byId,
    body: lessonFileVisibilitySchema,
    response: lessonFileViewSchema,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/lesson-files/:id',
    params: byId,
    response: 'empty',
  }),
  url: defineRoute({
    method: 'POST',
    path: '/lesson-files/:id/url',
    params: byId,
    response: signedDownloadSchema,
  }),
};

/** The family portal's recordings and lesson files, scoped by the student in the path. */
export const portalAssetsRoutes = {
  recordings: defineRoute({
    method: 'GET',
    path: '/portal/students/:id/recordings',
    params: byId,
    response: portalRecordingsSchema,
  }),
  lesson: defineRoute({
    method: 'GET',
    path: '/portal/students/:id/lessons/:lessonId/files',
    params: z.object({ id: z.uuid(), lessonId: z.uuid() }),
    response: portalLessonAssetsSchema,
  }),
  fileUrl: defineRoute({
    method: 'POST',
    path: '/portal/students/:id/lesson-files/:fileId/url',
    params: z.object({ id: z.uuid(), fileId: z.uuid() }),
    query: portalLessonFileUrlQuerySchema,
    response: portalFileUrlSchema,
  }),
};
