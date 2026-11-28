import { apiErrorCode, teacherPhotoCalls, userPhotoCalls } from '@ab/client-core';
import { apiFetch, apiSend, t } from '@ab/mobile-kit';
import { z } from 'zod';
import { uploadPhoto } from '@/account/hooks/account-api';
import type { PickedAvatar } from '@/account/lib/avatar';
import { staffPhotoErrorSchema } from './staff-photo-errors.schemas';
import type { StaffPhotoTarget } from './staff-photo.types';

const client = { apiFetch, apiSend };

export const teacherPhotos = teacherPhotoCalls(client);

export const userPhotos = userPhotoCalls(client);

/** Same three steps as the own photo; answers StaffPhotoView. */
export const uploadStaffPhoto = ({ calls, id }: StaffPhotoTarget, avatar: PickedAvatar) =>
  uploadPhoto(
    { uploadUrl: (body) => calls.uploadUrl(id, body), set: (body) => calls.set(id, body) },
    avatar,
  );

export const removeStaffPhoto = ({ calls, id }: StaffPhotoTarget) => calls.remove(id);

const MESSAGES = z.record(staffPhotoErrorSchema, z.string()).readonly().decode({
  avatar_not_staff: t.staffPhoto.errors.avatar_not_staff,
  avatar_type: t.account.errors.avatar_type,
  avatar_too_large: t.account.errors.avatar_too_large,
  avatar_path: t.account.errors.avatar_path,
});

export function staffPhotoError(error: unknown): string {
  const code = staffPhotoErrorSchema.safeParse(apiErrorCode(error));
  return code.success ? MESSAGES[code.data] : t.staffPhoto.errors.generic;
}
