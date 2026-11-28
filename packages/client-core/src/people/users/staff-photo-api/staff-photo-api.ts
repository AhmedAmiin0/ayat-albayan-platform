import { teacherPhotoRoutes, userPhotoRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { StaffPhotoCalls } from './staff-photo-api.types';

/** A teacher's photo, with or without a login. */
export function teacherPhotoCalls(client: ApiClient): StaffPhotoCalls {
  const call = callWith(client);
  return {
    uploadUrl: (id, body) => call({ route: teacherPhotoRoutes.uploadUrl, params: { id }, body }),
    set: (id, body) => call({ route: teacherPhotoRoutes.set, params: { id }, body }),
    remove: (id) => call({ route: teacherPhotoRoutes.remove, params: { id } }),
  };
}

/** A staff login's photo. */
export function userPhotoCalls(client: ApiClient): StaffPhotoCalls {
  const call = callWith(client);
  return {
    uploadUrl: (id, body) => call({ route: userPhotoRoutes.uploadUrl, params: { id }, body }),
    set: (id, body) => call({ route: userPhotoRoutes.set, params: { id }, body }),
    remove: (id) => call({ route: userPhotoRoutes.remove, params: { id } }),
  };
}
