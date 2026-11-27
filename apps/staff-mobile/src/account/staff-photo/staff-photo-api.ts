import {
  ACCOUNT_ERRORS,
  type AvatarSet,
  type AvatarUpload,
  type SignedUpload,
  type StaffPhotoView,
} from '@ab/shared';
import { ApiError, apiSend, t } from '@ab/mobile-kit';
import { uploadPhoto } from '@/account/hooks/account-api';
import type { PickedAvatar } from '@/account/lib/avatar';

// Admin write of a staff photo; same three steps as the own photo; answers StaffPhotoView.

const pathSteps = (base: string) => ({
  uploadUrl: (body: AvatarUpload) => apiSend<SignedUpload>('POST', `${base}/upload-url`, body),
  set: (body: AvatarSet) => apiSend<StaffPhotoView>('PUT', base, body),
});

export const uploadStaffPhoto = (base: string, avatar: PickedAvatar) =>
  uploadPhoto(pathSteps(base), avatar);

export const removeStaffPhoto = (base: string) => apiSend<StaffPhotoView>('DELETE', base);

const isAccountCode = (code: unknown): code is (typeof ACCOUNT_ERRORS)[number] =>
  ACCOUNT_ERRORS.some((c) => c === code);

export function staffPhotoError(error: unknown): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const code: unknown = body && typeof body === 'object' ? Reflect.get(body, 'code') : null;
  if (code === 'avatar_not_staff') return t.staffPhoto.errors.avatar_not_staff;
  if (isAccountCode(code) && code.startsWith('avatar_')) return t.account.errors[code];
  return t.staffPhoto.errors.generic;
}
