import { accountCalls, type PhotoSteps } from '@ab/client-core';
import { avatarUploadSchema } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';

/** Every /me call acts on the signed-in caller only (R-ACC-01..05). */
export const PROFILE_KEY = ['me', 'profile'] as const;

const account = accountCalls({ apiFetch, apiSend });

/** R-ACC-01: name, email, phone, photo and role of the signed-in user. */
export const profileQuery = queryOptions({
  queryKey: PROFILE_KEY,
  queryFn: account.profile,
  staleTime: 60_000,
  retry: 1,
});

/** R-ACC-02: the name, or the phone with the current password. */
export const updateProfile = account.updateProfile;

/** R-ACC-03: confirmed at once; the next sign-in uses the new email. */
export const changeEmail = account.changeEmail;

/** R-ACC-04: no answer, the session stays. */
export const changePassword = account.changePassword;

/**
 * A photo goes straight to the private `avatars` bucket through a one-off signed URL (same flow as
 * the payment receipt): ask the slot, upload to it, then store the path (the API re-checks it).
 * The steps are the caller's own photo (R-ACC-05) or an admin's write for a teacher or a login.
 */
export async function uploadPhoto<T>(steps: PhotoSteps<T>, file: File): Promise<T> {
  const slot = avatarUploadSchema.parse({ mime: file.type, size: file.size });
  const signed = await steps.uploadUrl(slot);
  const { error } = await uploadSigned(signed, { body: file, contentType: file.type });
  if (error) throw error;
  return steps.set({ path: signed.path });
}

/** R-ACC-05: the caller's own photo. */
export const uploadAvatar = (file: File) =>
  uploadPhoto({ uploadUrl: account.avatarUploadUrl, set: account.setAvatar }, file);

/** Back to the initials. */
export const removeAvatar = account.removeAvatar;
