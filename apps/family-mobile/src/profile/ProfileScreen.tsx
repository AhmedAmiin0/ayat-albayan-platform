import type { AccountProfile, PortalHome } from '@ab/shared';
import { t, useMyProfile } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ownStudent, usePortalMe } from '@/portal';
import { LoadState } from '@/ui';
import { ChildrenLinks } from './ChildrenLinks';
import { profileFacts } from './profile-facts';
import { ProfileDetails } from './ProfileDetails';
import { ProfileHero } from './ProfileHero';
import { whoLine } from './who-line';

interface ProfileData {
  profile: AccountProfile;
  me: PortalHome;
}

/** The hero, «بياناتي», then a guardian's children (a student has none). */
function ProfileBody({ profile, me }: ProfileData) {
  const own = ownStudent(me);
  return (
    <>
      <ProfileHero
        name={profile.full_name}
        line={whoLine(own)}
        photo={profile.avatar_url}
        seed={own?.id ?? null}
      />
      <ProfileDetails facts={profileFacts(profile, own)} />
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

/**
 * «الملف الشخصي», `profile`, pushed from the card on «حسابي»: the photo or initials, the name, the
 * WhatsApp number, a real email, a student's code, a guardian's children. Read-only (no editing,
 * no photo upload in this APK).
 */
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
