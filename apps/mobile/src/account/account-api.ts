import type { AccountProfile, SignedUpload } from '@ab/shared';
import { apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { PickedAvatar } from './avatar';

// The /me writes (R-ACC-02..05). Each answers the fresh profile, except the password (204).

export interface ProfilePatch {
  full_name?: string;
  phone_e164?: string | null;
  current_password?: string;
}

export const patchProfile = (body: ProfilePatch) => apiSend<AccountProfile>('PATCH', '/me/profile', body);

export const changeEmail = (body: { email: string; current_password: string }) =>
  apiSend<AccountProfile>('PUT', '/me/email', body);

export const changePassword = (body: { current_password: string; new_password: string }) =>
  apiSend<undefined>('PUT', '/me/password', body);

export const removeAvatar = () => apiSend<AccountProfile>('DELETE', '/me/avatar');

/** The API signed the upload but Storage did not take the file. */
export class AvatarUploadError extends Error {}

/**
 * R-ACC-05, the receipt's mechanics: POST /me/avatar/upload-url (the API picks the path in the
 * private `avatars` bucket), the signed upload straight to Storage, then PUT /me/avatar, which
 * re-checks the bytes and drops the previous photo.
 */
export async function uploadAvatar(avatar: PickedAvatar): Promise<AccountProfile> {
  const signed = await apiSend<SignedUpload>('POST', '/me/avatar/upload-url', {
    mime: avatar.mime,
    size: avatar.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, avatar.bytes, { contentType: avatar.mime });
  if (error) throw new AvatarUploadError(error.message);
  return apiSend<AccountProfile>('PUT', '/me/avatar', { path: signed.path });
}
