import { Button, t } from '@ab/web-kit';
import { LegalLinks } from '@/features/legal';
import { ChildRows } from '@/features/account/ChildRows';
import { SettingsCard } from '@/features/account/SettingsCard';
import { Who } from '@/features/account/Who';
import type { AccountPageProps } from './AccountPage.types';
import { useAccountPage } from './use-account-page';

export function AccountPage({ home }: AccountPageProps) {
  const { out } = useAccountPage();
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
      <LegalLinks />
    </section>
  );
}
