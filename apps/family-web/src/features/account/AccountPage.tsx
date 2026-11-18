import type { PortalHome, PortalKind } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { pill } from '@ab/web-kit/family/brand/pill';
import { Hero, HeroTitle } from '@ab/web-kit/family/layout/Hero';
import { PageBody } from '@ab/web-kit/family/layout/PageBody';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { GuardianCard } from './GuardianCard';
import { SettingsCard } from './SettingsCard';
import { StudentCard } from './StudentCard';
import { useSignOut } from './use-sign-out';

const WHO: Record<PortalKind, typeof GuardianCard> = {
  guardian: GuardianCard,
  student: StudentCard,
};

const LINE: Record<PortalKind, string> = {
  guardian: t.familyLook.account.lineGuardian,
  student: t.familyLook.account.lineStudent,
};

/**
 * «حسابي» (boards PortalWebAccount / PortalWebStudentAccount): who is in (a guardian's name, number
 * and children; a student's name and code), this browser's settings, «تسجيل الخروج».
 */
export function AccountPage({ home }: { home: PortalHome }) {
  const out = useSignOut();
  const Who = WHO[home.kind];
  return (
    <>
      <Hero labelledBy="account-title">
        <HeroTitle id="account-title" title={t.portal.app.tabs.account} line={LINE[home.kind]} />
      </Hero>
      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Who home={home} />
          <div className="grid gap-5">
            <SettingsCard kind={home.kind} />
            <button
              type="button"
              className={pill({ tone: 'outline', className: 'min-w-[170px] justify-self-start' })}
              disabled={out.isPending}
              onClick={() => out.mutate()}
            >
              <Icon name="logout" />
              {t.auth.logout}
            </button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
