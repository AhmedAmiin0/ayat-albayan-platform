import {
  lessonAssetsSchema,
  lessonFileViewSchema,
  signedDownloadSchema,
  signedUploadSchema,
  type LessonAssets,
  type LessonFileRegister,
  type LessonFileUpload,
  type LessonFileView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import type { ApiClient } from '../../core/http/index.js';

// Every answer parsed with the shared schema (rule 12).

const enc = encodeURIComponent;
const lessonPath = (id: string) => `/lessons/${enc(id)}/files`;
const filePath = (id: string) => `/lesson-files/${enc(id)}`;

/**
 * The key every lesson-files read sits under (one invalidation after a write). Not under
 * ['lessons']: a lesson write's refresh of the schedule must not wait for these reads.
 */
export const LESSON_FILES_KEY = ['lesson-files'];

export interface LessonFilesApi {
  lessonAssetsQuery: (lessonId: string) => {
    queryKey: string[];
    queryFn: () => Promise<LessonAssets>;
    staleTime: number;
  };
  uploadUrl: (input: { lessonId: string; file: LessonFileUpload }) => Promise<SignedUpload>;
  register: (input: { lessonId: string; file: LessonFileRegister }) => Promise<LessonFileView>;
  setVisible: (input: { id: string; visible: boolean }) => Promise<LessonFileView>;
  remove: (id: string) => Promise<void>;
  fileUrl: (id: string) => Promise<SignedDownload>;
}

export function lessonFilesApi(client: ApiClient): LessonFilesApi {
  const send = <T>(
    path: string,
    body: unknown,
    schema: { parse: (v: unknown) => T },
  ): Promise<T> => client.apiSend('POST', path, body).then((r: unknown) => schema.parse(r));
  return {
    lessonAssetsQuery: (lessonId) => ({
      queryKey: [...LESSON_FILES_KEY, lessonId],
      queryFn: async () => lessonAssetsSchema.parse(await client.apiFetch(lessonPath(lessonId))),
      // The recordings' signed links last an hour: read again well before.
      staleTime: 30 * 60_000,
    }),
    uploadUrl: ({ lessonId, file }) =>
      send(`${lessonPath(lessonId)}/upload-url`, file, signedUploadSchema),
    register: ({ lessonId, file }) => send(lessonPath(lessonId), file, lessonFileViewSchema),
    setVisible: ({ id, visible }) =>
      client
        .apiSend('PATCH', `${filePath(id)}/visibility`, { visible })
        .then((r: unknown) => lessonFileViewSchema.parse(r)),
    remove: (id) => client.apiSend('DELETE', filePath(id)),
    fileUrl: (id) => send(`${filePath(id)}/url`, undefined, signedDownloadSchema),
  };
}
