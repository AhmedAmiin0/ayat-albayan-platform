import { lessonFilesRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonFilesApi } from './lesson-files-api.types';

/**
 * The key every lesson-files read sits under (one invalidation after a write). Not under
 * ['lessons']: a lesson write's refresh of the schedule must not wait for these reads.
 */
export const LESSON_FILES_KEY = ['lesson-files'];

/** The recordings' signed links last an hour: read again well before. */
const ASSETS_STALE_MS = 30 * 60_000;

export function lessonFilesApi(client: ApiClient): LessonFilesApi {
  const call = callWith(client);
  return {
    lessonAssetsQuery: (lessonId) => ({
      queryKey: [...LESSON_FILES_KEY, lessonId],
      queryFn: () => call({ route: lessonFilesRoutes.list, params: { id: lessonId } }),
      staleTime: ASSETS_STALE_MS,
    }),
    uploadUrl: ({ lessonId, file }) =>
      call({ route: lessonFilesRoutes.uploadUrl, params: { id: lessonId }, body: file }),
    register: ({ lessonId, file }) =>
      call({ route: lessonFilesRoutes.register, params: { id: lessonId }, body: file }),
    setVisible: ({ id, visible }) =>
      call({ route: lessonFilesRoutes.visibility, params: { id }, body: { visible } }),
    remove: (id) => call({ route: lessonFilesRoutes.remove, params: { id } }),
    fileUrl: (id) => call({ route: lessonFilesRoutes.url, params: { id } }),
  };
}
