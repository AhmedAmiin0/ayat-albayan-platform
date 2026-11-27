import {
  familyChildren,
  ownStudent,
  profileFacts,
  whoLine,
  type OwnProfile,
} from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { t } from '@ab/web-kit';
import { ChildrenLinks } from '@/features/account/profile/ChildrenLinks';
import { ProfileDetails } from '@/features/account/profile/ProfileDetails';
import { ProfileHero } from '@/features/account/profile/ProfileHero';

export function ProfileBody({ profile, home }: { profile: OwnProfile; home: PortalHome }) {
  const own = ownStudent(home);
  return (
    <div className="grid animate-fade-in items-start gap-5 md:grid-cols-2">
      <div className="grid gap-5">
        <ProfileHero
          name={profile.full_name}
          line={whoLine(own, t.portal.app.account)}
          photo={profile.avatar_url}
          seed={own?.id ?? null}
        />
        <ProfileDetails facts={profileFacts(profile, own, t.portal.app.profile)} />
      </div>
      <ChildrenLinks students={own ? [] : familyChildren(home)} />
    </div>
  );
}
