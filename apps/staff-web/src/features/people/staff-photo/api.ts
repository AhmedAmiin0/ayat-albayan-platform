import { teacherPhotoCalls, userPhotoCalls, type StaffPhotoCalls } from '@ab/client-core';
import { z } from 'zod';
import { uploadPhoto } from '@/features/people/account';
import { apiFetch, apiSend } from '@ab/web-kit';
import { staffPhotoKindSchema, type StaffPhotoTarget } from './staff-photo.schemas';

const client = { apiFetch, apiSend };
const CALLS = z
  .record(staffPhotoKindSchema, z.custom<StaffPhotoCalls>())
  .readonly()
  .decode({ teachers: teacherPhotoCalls(client), users: userPhotoCalls(client) });

export const uploadStaffPhoto = ({ kind, id }: StaffPhotoTarget, file: File) =>
  uploadPhoto(
    {
      uploadUrl: (body) => CALLS[kind].uploadUrl(id, body),
      set: (body) => CALLS[kind].set(id, body),
    },
    file,
  );

/** Back to the initials. */
export const removeStaffPhoto = ({ kind, id }: StaffPhotoTarget) => CALLS[kind].remove(id);
