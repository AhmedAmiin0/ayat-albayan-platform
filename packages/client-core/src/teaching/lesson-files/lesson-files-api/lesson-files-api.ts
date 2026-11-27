import { lessonFilesRoutes as routes } from '@ab/shared';
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
  const byId = (id: string) => ({ id });
  return {
    lessonAssetsQuery: (lessonId) => ({
      queryKey: [...LESSON_FILES_KEY, lessonId],
      queryFn: () => call({ route: routes.list, params: byId(lessonId) }),
      staleTime: ASSETS_STALE_MS,
    }),
    uploadUrl: ({ lessonId, file }) =>
      call({ route: routes.uploadUrl, params: byId(lessonId), body: file }),
    register: ({ lessonId, file }) =>
      call({ route: routes.register, params: byId(lessonId), body: file }),
    setVisible: ({ id, visible }) =>
      call({ route: routes.visibility, params: byId(id), body: { visible } }),
    remove: (id) => call({ route: routes.remove, params: byId(id) }),
    fileUrl: (id) => call({ route: routes.url, params: byId(id) }),
  };
}
