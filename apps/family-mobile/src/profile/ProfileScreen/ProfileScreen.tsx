import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { LoadState } from '@/ui';
import { ProfileBody } from './ProfileBody';
import { useProfileScreen } from './use-profile-screen';

/** Read-only: no editing and no photo upload in this build. */
export function ProfileScreen() {
  const read = useProfileScreen();
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.profile.title} back />}
      onRefresh={read.refetch}
    >
      <LoadState query={read}>{(data) => <ProfileBody {...data} />}</LoadState>
    </FamilyPage>
  );
}
