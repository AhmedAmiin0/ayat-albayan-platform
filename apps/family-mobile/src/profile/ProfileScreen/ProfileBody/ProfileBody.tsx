import { profileFacts, whoLine } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { ownStudent } from '@/portal';
import { ChildrenLinks } from '@/profile/ChildrenLinks';
import { ProfileDetails } from '@/profile/ProfileDetails';
import { ProfileHero } from '@/profile/ProfileHero';
import type { ProfileBodyProps } from './ProfileBody.types';

export function ProfileBody({ profile, me }: ProfileBodyProps) {
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
