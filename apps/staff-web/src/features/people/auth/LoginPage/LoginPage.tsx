import { useState } from 'react';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Tabs, tabIds } from '@ab/web-kit/components/ui/layout/tabs';
import { env } from '@ab/web-kit/lib/http/env';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { BindingCover } from '@/features/people/auth/BindingCover';
import { FamilyPanel } from '@/features/people/auth/family/FamilyPanel';
import { FamilyHostLink } from '@/features/people/auth/login/FamilyHostLink';
import { StaffPanel } from '@/features/people/auth/login/StaffPanel';

type Tab = 'staff' | 'family';
const TABS: { value: Tab; label: string }[] = [
  { value: 'staff', label: t.familyAuth.tabs.staff },
  { value: 'family', label: t.familyAuth.tabs.family },
];

/** Only the active panel is rendered; with the family host live, staff form only (docs/51 §3). */
export function LoginPage() {
  const host = env.familyOrigin;
  return (
    <main className="grid min-h-screen bg-page shell:grid-cols-2">
      <div className="grid items-start justify-items-center px-4 py-8 sm:px-8 sm:py-12 shell:place-items-center">
        <div className="grid w-full max-w-[380px] gap-[22px]">
          {/* One row with the title so the switch costs no height on phones. */}
          <div className="flex items-center justify-between gap-3">
            <Cartouche>{t.auth.loginTitle}</Cartouche>
            <LanguageSwitch />
          </div>
          {host ? <StaffOnly host={host} /> : <LoginTabs />}
        </div>
      </div>
      <BindingCover />
    </main>
  );
}

function StaffOnly({ host }: { host: string }) {
  return (
    <>
      <StaffPanel />
      <FamilyHostLink host={host} />
    </>
  );
}

function LoginTabs() {
  const [tab, setTab] = useState<Tab>('staff');
  const ids = tabIds('login', tab);
  return (
    <>
      <Tabs label={t.familyAuth.tabs.label} tabs={TABS} value={tab} onChange={setTab} idPrefix="login" className="mb-0" />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="grid gap-[22px]">
        {tab === 'staff' ? <StaffPanel /> : <FamilyPanel />}
      </div>
      {tab === 'staff' && (
        <p className="border-t border-rule pt-4 text-xs text-pretty text-ink-3">{t.auth.guardiansNote}</p>
      )}
    </>
  );
}
