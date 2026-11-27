import type { RouteResult } from '@ab/core';
import type { portalAssetsRoutes } from '@ab/shared';

type Routes = typeof portalAssetsRoutes;
type Result<K extends keyof Routes> = RouteResult<Routes[K]>;

export interface PortalRead<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  refetchOnWindowFocus: boolean;
}

export interface PortalLessonInput {
  studentId: string;
  lessonId: string;
}

export interface PortalLessonFileInput {
  studentId: string;
  fileId: string;
  download?: string;
}

export interface PortalAssetsApi {
  portalRecordingsQuery: (studentId: string) => PortalRead<Result<'recordings'>>;
  portalLessonAssetsQuery: (input: PortalLessonInput) => PortalRead<Result<'lesson'>>;
  /** A fresh 1-hour link to one visible lesson file; with `download` it saves under that name. */
  lessonFileUrl: (input: PortalLessonFileInput) => Promise<Result<'fileUrl'>>;
}
