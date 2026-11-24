import type { AccountProfile, SignedUpload } from '@ab/shared';
import { apiSend } from '@ab/mobile-kit';
import { uploadSigned } from '@/core/lib/http/upload-slot';
import type { PickedAvatar } from '@/account/lib/avatar';

// The /me writes (R-ACC-02..05). Each answers the fresh profile
// (the password, which every login may change, is the kit's: @ab/mobile-kit account).

interface ProfilePatch {
  full_name?: string;
  phone_e164?: string | null;
  current_password?: string;
}

export const patchProfile = (body: ProfilePatch) => apiSend<AccountProfile>('PATCH', '/me/profile', body);

export const changeEmail = (body: { email: string; current_password: string }) =>
  apiSend<AccountProfile>('PUT', '/me/email', body);

export const removeAvatar = () => apiSend<AccountProfile>('DELETE', '/me/avatar');

/** The API signed the upload but Storage did not take the file. */
export class AvatarUploadError extends Error {}

/** R-ACC-05: the API picks the private path; PUT re-checks the bytes and drops the old photo. */
export async function uploadPhoto<T>(base: string, avatar: PickedAvatar): Promise<T> {
  const signed = await apiSend<SignedUpload>('POST', `${base}/upload-url`, {
    mime: avatar.mime,
    size: avatar.size,
  });
  const { error } = await uploadSigned(signed, { body: avatar.bytes, contentType: avatar.mime });
  if (error) throw new AvatarUploadError(error.message);
  return apiSend<T>('PUT', base, { path: signed.path });
}

export const uploadAvatar = (avatar: PickedAvatar) => uploadPhoto<AccountProfile>('/me/avatar', avatar);
