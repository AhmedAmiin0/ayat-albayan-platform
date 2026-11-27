import { Link } from '@tanstack/react-router';
import { buttonVariants, t, QueryState } from '@ab/web-kit';
import type { ProfilePageProps } from './ProfilePage.types';
import { ProfileBody } from './ProfileBody';
import { useProfilePage } from './use-profile-page';

/** Read-only: the academy changes the details. */
export function ProfilePage({ home }: ProfilePageProps) {
  const { profile } = useProfilePage();
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
