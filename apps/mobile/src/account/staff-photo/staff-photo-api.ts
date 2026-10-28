import { ACCOUNT_ERRORS, type StaffPhotoView } from '@ab/shared';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { uploadPhoto } from '../hooks/account-api';
import type { PickedAvatar } from '../lib/avatar';

// An admin's write of a staff member's photo: `/teachers/:id/avatar` (admin) or `/users/:id/avatar`
// (users.write). The same three steps as «حسابي» (uploadPhoto); PUT and DELETE answer StaffPhotoView.

export const uploadStaffPhoto = (base: string, avatar: PickedAvatar) => uploadPhoto<StaffPhotoView>(base, avatar);

export const removeStaffPhoto = (base: string) => apiSend<StaffPhotoView>('DELETE', base);

const isAccountCode = (code: unknown): code is (typeof ACCOUNT_ERRORS)[number] => ACCOUNT_ERRORS.some((c) => c === code);

/** The failure in words: a student/guardian login, the file's own problem, else «تعذّر حفظ الصورة». */
export function staffPhotoError(error: unknown): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const code: unknown = body && typeof body === 'object' ? Reflect.get(body, 'code') : null;
  if (code === 'avatar_not_staff') return t.staffPhoto.errors.avatar_not_staff;
  if (isAccountCode(code) && code.startsWith('avatar_')) return t.account.errors[code];
  return t.staffPhoto.errors.generic;
}
