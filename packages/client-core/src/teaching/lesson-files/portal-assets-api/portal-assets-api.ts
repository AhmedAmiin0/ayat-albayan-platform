import { fillRoutePath, type RouteSpec } from '@ab/core';
import { portalAssetsRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import { pathKey } from '../../../core/keys';
import type { PortalAssetsApi, PortalRead } from './portal-assets-api.types';

// Under the portal's key so the portal's one invalidation refreshes them too.

const keyOf = (route: RouteSpec, params: Record<string, string>): string[] =>
  pathKey(fillRoutePath(route.path, params));

const read = <T>(queryKey: string[], queryFn: () => Promise<T>): PortalRead<T> => ({
  queryKey,
  queryFn,
  refetchOnWindowFocus: true,
});

export function portalAssetsApi(client: ApiClient): PortalAssetsApi {
  const call = callWith(client);
  return {
    portalRecordingsQuery: (studentId) => {
      const params = { id: studentId };
      return read(keyOf(portalAssetsRoutes.recordings, params), () =>
        call({ route: portalAssetsRoutes.recordings, params }),
      );
    },
    portalLessonAssetsQuery: ({ studentId, lessonId }) => {
      const params = { id: studentId, lessonId };
      return read(keyOf(portalAssetsRoutes.lesson, params), () =>
        call({ route: portalAssetsRoutes.lesson, params }),
      );
    },
    lessonFileUrl: ({ studentId, fileId, download }) =>
      call({
        route: portalAssetsRoutes.fileUrl,
        params: { id: studentId, fileId },
        query: { download },
      }),
  };
}
