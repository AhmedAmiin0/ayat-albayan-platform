import type { UserDetail } from '@ab/shared';
import { StaffPhotoControl } from '@/account';
import { pathKey } from '@/core/lib/query/query-keys';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { USERS_KEY } from '../shared/api';

/** The users list and page, and a teacher's own pages (a teacher login's photo is the teacher's). */
const PHOTO_KEYS = [USERS_KEY, pathKey('/teachers'), pathKey('/sales/teachers')];

/** Students and guardians never carry a photo (owner 2026-10-28: initials only). */
const isStaffRole = (role: UserDetail['role']): boolean => role !== 'student' && role !== 'guardian';

/**
 * The user's photo on their page: with users.write and a staff login «الصورة» (change / remove),
 * otherwise the photo or the initials alone.
 */
export function UserPhoto({ user, canWrite }: { user: UserDetail; canWrite: boolean }) {
  const photo = user.avatar_url ?? null;
  if (canWrite && isStaffRole(user.role)) {
    return (
      <StaffPhotoControl
        name={user.full_name}
        id={user.id}
        base={`/users/${user.id}/avatar`}
        photo={photo}
        invalidate={PHOTO_KEYS}
      />
    );
  }
  return <Avatar name={user.full_name} id={user.id} src={photo} size="lg" />;
}
