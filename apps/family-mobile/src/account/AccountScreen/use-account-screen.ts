import { useMyProfile } from '@ab/mobile-kit';
import { ownStudent, usePickedChild, usePortalMe } from '@/portal';

export function useAccountScreen() {
  const profile = useMyProfile();
  const me = usePortalMe().data;
  const own = me ? ownStudent(me) : null;
  const child = usePickedChild();
  return { profile, own, child };
}
