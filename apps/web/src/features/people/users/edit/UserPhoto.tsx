import type { UserDetail } from '@ab/shared';
import { Avatar } from '@/components/ui/display/avatar';
import { StaffPhotoControl } from '@/features/people/staff-photo';

/** Students and guardians never get a photo (owner 2026-10-28: initials only; the API says avatar_not_staff). */
const NO_PHOTO = new Set<UserDetail['role']>(['student', 'guardian']);

/** The panel's head: the user's photo or initials and, for a staff login with users.write, change / remove. */
export function UserPhoto({ user, canWrite }: { user: UserDetail; canWrite: boolean }) {
  const staff = !NO_PHOTO.has(user.role);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <Avatar name={user.full_name} id={user.avatar_seed ?? user.id} src={staff ? user.avatar_url : null} size="lg" />
      {canWrite && staff && (
        <StaffPhotoControl
          kind="users"
          id={user.id}
          name={user.full_name}
          hasPhoto={!!user.avatar_url}
          className="min-w-0 flex-1 basis-56"
        />
      )}
    </div>
  );
}
