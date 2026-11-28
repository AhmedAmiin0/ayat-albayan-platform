import type { RouteBody, RouteResult } from '@ab/core';
import type { lessonFilesRoutes } from '@ab/shared';

type Routes = typeof lessonFilesRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface LessonFileInput<K extends 'uploadUrl' | 'register'> {
  lessonId: string;
  file: RouteBody<Routes[K]>;
}

export interface LessonFilesApi {
  lessonAssetsQuery: (lessonId: string) => {
    queryKey: string[];
    queryFn: () => Answer<'list'>;
    staleTime: number;
  };
  uploadUrl: (input: LessonFileInput<'uploadUrl'>) => Answer<'uploadUrl'>;
  register: (input: LessonFileInput<'register'>) => Answer<'register'>;
  setVisible: (input: { id: string; visible: boolean }) => Answer<'visibility'>;
  remove: (id: string) => Answer<'remove'>;
  fileUrl: (id: string) => Answer<'url'>;
}
