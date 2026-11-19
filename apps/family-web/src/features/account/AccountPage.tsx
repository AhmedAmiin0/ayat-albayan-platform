import type { PortalHome } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildRows } from './ChildRows';
import { SettingsCard } from './SettingsCard';
import { useSignOut } from './use-sign-out';
import { Who } from './Who';

/** «حسابي»: who is in, a guardian's children, this browser's settings, «تسجيل الخروج». */
export function AccountPage({ home }: { home: PortalHome }) {
  const out = useSignOut();
  return (
    <section aria-labelledby="account-title" className="grid gap-5">
      <h1 id="account-title" className="font-display text-h2 font-bold">
        {t.portal.app.tabs.account}
      </h1>
      <Who home={home} />
      {home.kind === 'guardian' && <ChildRows home={home} />}
      <SettingsCard />
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start"
        disabled={out.isPending}
        onClick={() => out.mutate()}
      >
        {t.auth.logout}
      </Button>
    </section>
  );
}
