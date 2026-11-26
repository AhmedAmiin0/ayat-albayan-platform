import { profileFacts, whoLine } from '@ab/client-core';
import type { AccountProfile, PortalHome } from '@ab/shared';
import { t, useMyProfile } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ownStudent, usePortalMe } from '@/portal';
import { LoadState } from '@/ui';
import { ChildrenLinks } from '@/profile/ChildrenLinks';
import { ProfileDetails } from '@/profile/ProfileDetails';
import { ProfileHero } from '@/profile/ProfileHero';

interface ProfileData {
  profile: AccountProfile;
  me: PortalHome;
}

function ProfileBody({ profile, me }: ProfileData) {
  const own = ownStudent(me);
  return (
    <>
      <ProfileHero
        name={profile.full_name}
        line={whoLine(own, t.portal.app.account)}
        photo={profile.avatar_url}
        seed={own?.id ?? null}
      />
      <ProfileDetails facts={profileFacts(profile, own, t.portal.app.profile)} />
      <ChildrenLinks students={own ? [] : me.students} />
    </>
  );
}

/**
 * GET /me/profile and /portal/me as one read: whole only when both are in, so a student never
 * shows as a guardian for a moment. Retry and pull read both again.
 */
function useProfileRead() {
  const profile = useMyProfile();
  const me = usePortalMe();
  const data = profile.data && me.data ? { profile: profile.data, me: me.data } : undefined;
  return {
    data,
    isError: profile.isError || me.isError,
    refetch: () => Promise.all([profile.refetch(), me.refetch()]),
  };
}

/** Read-only: no editing and no photo upload in this build. */
export function ProfileScreen() {
  const read = useProfileRead();
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.profile.title} back />}
      onRefresh={read.refetch}
    >
      <LoadState query={read}>{(data) => <ProfileBody {...data} />}</LoadState>
    </FamilyPage>
  );
}
