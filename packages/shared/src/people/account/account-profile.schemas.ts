import { userRoleSchema } from '@ab/catalog';
import { E164_RE, id } from '@ab/core';
import { z } from 'zod';

/** The held role as the account page names it (the custom role's names, else the system role's). */
export const accountRoleSchema = z.object({
  base: userRoleSchema.nullable(),
  key: z.string().nullable(),
  name_ar: z.string().nullable(),
  name_en: z.string().nullable(),
});
export type AccountRole = z.infer<typeof accountRoleSchema>;

/** GET /me/profile (R-ACC-01) and the answer of every /me change. Never holds a secret. */
export const accountProfileSchema = z.object({
  id: id(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone_e164: z.string().regex(E164_RE).nullable(),
  /** A short-lived signed URL of the photo, or null (initials are shown). */
  avatar_url: z.string().nullable(),
  /** What avatarTone hashes: the linked teacher's id, else the profile's (one tone per person). */
  avatar_seed: z.string().optional(),
  role: accountRoleSchema,
});
export type AccountProfile = z.infer<typeof accountProfileSchema>;

/** The answer of an admin's PUT / DELETE /teachers/:id/avatar and /users/:id/avatar. */
export const staffPhotoViewSchema = z.object({ avatar_url: z.string().nullable() });
export type StaffPhotoView = z.infer<typeof staffPhotoViewSchema>;
