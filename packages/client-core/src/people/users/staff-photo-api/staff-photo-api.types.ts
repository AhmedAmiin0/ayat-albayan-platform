import type { RouteBody, RouteResult } from '@ab/core';
import type { AvatarSet, AvatarUpload, SignedUpload, teacherPhotoRoutes } from '@ab/shared';

type Routes = typeof teacherPhotoRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Send<K extends keyof Routes> = (id: string, body: RouteBody<Routes[K]>) => Answer<K>;

/** The admin's photo writes for one teacher or one staff login; both tables share this shape. */
export interface StaffPhotoCalls {
  uploadUrl: Send<'uploadUrl'>;
  set: Send<'set'>;
  remove: (id: string) => Answer<'remove'>;
}

/** The two api steps around a photo upload: a signed slot first, then the uploaded path. */
export interface PhotoSteps<T> {
  uploadUrl: (body: AvatarUpload) => Promise<SignedUpload>;
  set: (body: AvatarSet) => Promise<T>;
}
