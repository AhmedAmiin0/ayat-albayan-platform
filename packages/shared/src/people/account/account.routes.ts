import { defineRoute } from '@ab/core';
import { signedUploadSchema } from '../../reports';
import { accountProfileSchema } from './account-profile.schemas';
import {
  avatarSetSchema,
  avatarUploadSchema,
  emailChangeSchema,
  passwordChangeSchema,
  profileUpdateSchema,
} from './account.schemas';
import { accountSetupSchema } from './account-setup';
import { localeUpdateSchema } from './locale';

const access = { tags: ['me'] } as const;

/** A code-made teacher login's own email and password, set once (docs/46 A4). */
export const accountSetupRoutes = {
  setup: defineRoute({
    ...access,
    method: 'PUT',
    path: '/me/setup',
    body: accountSetupSchema,
    response: 'empty',
  }),
};

/** The caller's own login (R-ACC-01..05): no id in any path, a disabled account gets 403. */
export const accountRoutes = {
  /** Read back by /auth/me and /portal/me. */
  locale: defineRoute({
    ...access,
    method: 'PATCH',
    path: '/me/locale',
    body: localeUpdateSchema,
    response: localeUpdateSchema,
  }),
  profile: defineRoute({
    ...access,
    method: 'GET',
    path: '/me/profile',
    response: accountProfileSchema,
  }),
  /** 409 phone_taken; a phone change needs the current password. */
  updateProfile: defineRoute({
    ...access,
    method: 'PATCH',
    path: '/me/profile',
    body: profileUpdateSchema,
    response: accountProfileSchema,
  }),
  email: defineRoute({
    ...access,
    method: 'PUT',
    path: '/me/email',
    body: emailChangeSchema,
    response: accountProfileSchema,
  }),
  password: defineRoute({
    ...access,
    method: 'PUT',
    path: '/me/password',
    body: passwordChangeSchema,
    response: 'empty',
  }),
  /** The browser or phone then PUTs the file to the signed URL. */
  avatarUploadUrl: defineRoute({
    ...access,
    method: 'POST',
    path: '/me/avatar/upload-url',
    body: avatarUploadSchema,
    response: signedUploadSchema,
  }),
  setAvatar: defineRoute({
    ...access,
    method: 'PUT',
    path: '/me/avatar',
    body: avatarSetSchema,
    response: accountProfileSchema,
  }),
  removeAvatar: defineRoute({
    ...access,
    method: 'DELETE',
    path: '/me/avatar',
    response: accountProfileSchema,
  }),
};
