import type { StaffPhotoView } from '@ab/shared';
import { uploadPhoto } from '@/features/people/account';
import { apiSend } from '@/lib/http/api';

/** Whose photo an admin edits: a teacher (teachers.write) or a staff login (users.write). */
export type StaffPhotoKind = 'teachers' | 'users';

export interface StaffPhotoTarget {
  kind: StaffPhotoKind;
  id: string;
}

const base = ({ kind, id }: StaffPhotoTarget) => `/${kind}/${encodeURIComponent(id)}/avatar`;

/** POST …/avatar/upload-url → upload to the signed URL → PUT …/avatar {path} (the «حسابي» flow). */
export const uploadStaffPhoto = (target: StaffPhotoTarget, file: File) =>
  uploadPhoto<StaffPhotoView>(base(target), file);

/** DELETE …/avatar: back to the initials. */
export const removeStaffPhoto = (target: StaffPhotoTarget) =>
  apiSend<StaffPhotoView>('DELETE', base(target));
