import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { signedUploadSchema } from '../../reports';
import { staffPhotoViewSchema } from './account-profile.schemas';
import { avatarSetSchema, avatarUploadSchema } from './account.schemas';

const byId = z.object({ id: id() });

/** Same three steps as the own photo: a signed upload URL, the upload, then the stored path. */
const photoRoutes = <const P extends string>(base: `/${string}`, permission: P) => {
  const access = { permissions: [permission], tags: ['staff-photos'] } as const;
  return {
    uploadUrl: defineRoute({
      ...access,
      method: 'POST',
      path: `${base}/:id/avatar/upload-url`,
      params: byId,
      body: avatarUploadSchema,
      response: signedUploadSchema,
    }),
    set: defineRoute({
      ...access,
      method: 'PUT',
      path: `${base}/:id/avatar`,
      params: byId,
      body: avatarSetSchema,
      response: staffPhotoViewSchema,
    }),
    remove: defineRoute({
      ...access,
      method: 'DELETE',
      path: `${base}/:id/avatar`,
      params: byId,
      response: staffPhotoViewSchema,
    }),
  };
};

/** A teacher's photo, with or without a login. */
export const teacherPhotoRoutes = photoRoutes('/teachers', 'teachers.write');

/** A staff login's photo; the api also applies the usual rules on touching another login. */
export const userPhotoRoutes = photoRoutes('/users', 'users.write');
