/** The error codes of /me (400 / 409), for the forms' field-level messages. */
export const ACCOUNT_ERRORS = [
  'wrong_password',
  'password_required',
  'password_too_short',
  'password_too_long',
  'password_same',
  'phone_taken',
  'email_taken',
  'invalid_email',
  'avatar_type',
  'avatar_too_large',
  'avatar_path',
  'name_too_short',
  'name_too_long',
] as const;
export type AccountError = (typeof ACCOUNT_ERRORS)[number];

/** The answer of an admin's PUT / DELETE /teachers/:id/avatar and /users/:id/avatar. */
export interface StaffPhotoView {
  avatar_url: string | null;
}
