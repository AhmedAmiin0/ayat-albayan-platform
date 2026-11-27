import { accountCalls, type PhotoSteps } from '@ab/client-core';
import type {
  AccountProfile,
  AvatarSet,
  AvatarUpload,
  SignedUpload,
  StaffPhotoView,
} from '@ab/shared';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { uploadSigned } from '@/core/lib/http/upload-slot';
import type { PickedAvatar } from '@/account/lib/avatar';

// The /me writes (R-ACC-02..05). Each answers the fresh profile
// (the password, which every login may change, is the kit's: @ab/mobile-kit account).

const account = accountCalls({ apiFetch, apiSend });

export const patchProfile = account.updateProfile;

export const changeEmail = account.changeEmail;

export const removeAvatar = account.removeAvatar;

/** The API signed the upload but Storage did not take the file. */
export class AvatarUploadError extends Error {}

/** R-ACC-05: the API picks the private path; the last step re-checks the bytes. */
export async function uploadPhoto<T>(steps: PhotoSteps<T>, avatar: PickedAvatar): Promise<T> {
  const signed = await steps.uploadUrl({ mime: avatar.mime, size: avatar.size });
  const { error } = await uploadSigned(signed, { body: avatar.bytes, contentType: avatar.mime });
  if (error) throw new AvatarUploadError(error.message);
  return steps.set({ path: signed.path });
}

/** An admin's write of `/teachers/:id/avatar` or `/users/:id/avatar`, still by path. */
export const staffPhotoSteps = (base: string): PhotoSteps<StaffPhotoView> => ({
  uploadUrl: (body: AvatarUpload) => apiSend<SignedUpload>('POST', `${base}/upload-url`, body),
  set: (body: AvatarSet) => apiSend<StaffPhotoView>('PUT', base, body),
});

export const uploadAvatar = (avatar: PickedAvatar): Promise<AccountProfile> =>
  uploadPhoto({ uploadUrl: account.avatarUploadUrl, set: account.setAvatar }, avatar);
