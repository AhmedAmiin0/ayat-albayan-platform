import { familyChildren, ownStudent, profileFacts, whoLine, type OwnProfile } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { ChildrenLinks } from './ChildrenLinks';
import { ProfileDetails } from './ProfileDetails';
import { ProfileHero } from './ProfileHero';
import { useOwnProfile } from './use-own-profile';

function ProfileBody({ profile, home }: { profile: OwnProfile; home: PortalHome }) {
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

/** Read-only: the academy changes the details. */
export function ProfilePage({ home }: { home: PortalHome }) {
  const profile = useOwnProfile();
  return (
    <section aria-labelledby="profile-title" className="grid gap-4">
      <div className="justify-self-start">
        <Link to="/account" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          {t.portal.app.tabs.account}
        </Link>
      </div>
      <h1 id="profile-title" className="font-display text-h2 font-bold">
        {t.portal.app.profile.title}
      </h1>
      <QueryState query={profile}>
        {(data) => <ProfileBody profile={data} home={home} />}
      </QueryState>
    </section>
  );
}
