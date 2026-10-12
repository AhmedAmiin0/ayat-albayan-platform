import { z } from 'zod';
import { phoneE164 } from '../schemas/common.js';
import { PASSWORD_MAX } from '../users/validation.js';

// «حسابي» (R-ACC-01..05, owner 2026-10-06): what a signed-in user may change on their OWN login.
// Only these fields exist here: role, role_id and disabled_* are never part of a body (rule 9).

export const ACCOUNT_NAME_MIN = 2;
export const ACCOUNT_NAME_MAX = 80;
/** Same as the `avatars` bucket (migration 20261012000350). */
export const AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AvatarMime = (typeof AVATAR_MIMES)[number];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const password = z.string().min(1, 'password_required').max(PASSWORD_MAX);
const fullName = z.string().trim().min(ACCOUNT_NAME_MIN, 'name_too_short').max(ACCOUNT_NAME_MAX, 'name_too_long');

/**
 * PATCH /me/profile (R-ACC-02). Unknown keys (role, role_id, disabled_at…) are stripped, so a body
 * of only those is an empty update (400). A phone change needs the current password.
 */
export const profileUpdateSchema = z
  .object({
    full_name: fullName.optional(),
    /** Blank or null removes the number. */
    phone_e164: z.preprocess(blank, phoneE164.nullable().optional()),
    current_password: password.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.full_name === undefined && v.phone_e164 === undefined) ctx.addIssue({ code: 'custom', path: [], message: 'empty_update' });
    if (v.phone_e164 !== undefined && !v.current_password)
      ctx.addIssue({ code: 'custom', path: ['current_password'], message: 'password_required' });
  });
export type ProfileUpdate = z.output<typeof profileUpdateSchema>;

/** PUT /me/email (R-ACC-03). */
export const emailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('invalid_email').max(254)),
  current_password: password,
});
export type EmailChange = z.output<typeof emailChangeSchema>;

/** PUT /me/password (R-ACC-04). The minimum length is the API's AUTH_PASSWORD_MIN_LENGTH. */
export const passwordChangeSchema = z.object({
  current_password: password,
  new_password: z.string().max(PASSWORD_MAX, 'password_too_long'),
});
export type PasswordChange = z.output<typeof passwordChangeSchema>;

/** POST /me/avatar/upload-url (R-ACC-05): the browser or phone then PUTs the file to the signed URL. */
export const avatarUploadSchema = z.object({
  mime: z.enum(AVATAR_MIMES, { message: 'avatar_type' }),
  size: z.int().min(1).max(AVATAR_MAX_BYTES, { message: 'avatar_too_large' }),
});
export type AvatarUpload = z.output<typeof avatarUploadSchema>;

/** PUT /me/avatar: the uploaded path, `<uid>/avatar-<timestamp>.<ext>`; the API re-checks it. */
export const avatarSetSchema = z.object({ path: z.string().min(1).max(200) });
export type AvatarSet = z.output<typeof avatarSetSchema>;
