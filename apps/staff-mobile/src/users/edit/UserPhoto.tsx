import type { UserDetail } from '@ab/shared';
import { StaffPhotoControl, userPhotos } from '@/account';
import { pathKey, Avatar } from '@ab/mobile-kit';
import { USERS_KEY } from '@/users/shared/api';

/** The users list and page, and a teacher's own pages (a teacher login's photo is the teacher's). */
const PHOTO_KEYS = [USERS_KEY, pathKey('/teachers'), pathKey('/sales/teachers')];

/** Students and guardians never carry a photo (initials only). */
const isStaffRole = (role: UserDetail['role']): boolean => role !== 'student' && role !== 'guardian';

/** Change or remove needs users.write and a staff login. */
export function UserPhoto({ user, canWrite }: { user: UserDetail; canWrite: boolean }) {
  const photo = user.avatar_url ?? null;
  if (canWrite && isStaffRole(user.role)) {
    return (
      <StaffPhotoControl
        name={user.full_name}
        id={user.id}
        calls={userPhotos}
        photo={photo}
        invalidate={PHOTO_KEYS}
      />
    );
  }
  return <Avatar name={user.full_name} id={user.avatar_seed ?? user.id} src={photo} size="lg" />;
}
