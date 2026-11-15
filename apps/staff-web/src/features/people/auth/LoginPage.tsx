import { useState } from 'react';
import { LanguageSwitch } from '@/components/shell/account/LanguageSwitch';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Tabs, tabIds } from '@/components/ui/layout/tabs';
import { t } from '@/lib/i18n/i18n';
import { BindingCover } from './BindingCover';
import { FamilyPanel } from './family/FamilyPanel';
import { StaffPanel } from './login/StaffPanel';

type Tab = 'staff' | 'family';
const TABS: { value: Tab; label: string }[] = [
  { value: 'staff', label: t.familyAuth.tabs.staff },
  { value: 'family', label: t.familyAuth.tabs.family },
];

/**
 * Login (docs/07 login section, docs/30 §7): the forms beside the leather binding; cover on top on
 * phones. Two tabs, «فريق الأكاديمية» first; only the active panel is rendered.
 */
export function LoginPage() {
  const [tab, setTab] = useState<Tab>('staff');
  const ids = tabIds('login', tab);

  return (
    <main className="grid min-h-screen bg-page shell:grid-cols-2">
      <div className="grid items-start justify-items-center px-4 py-8 sm:px-8 sm:py-12 shell:place-items-center">
        <div className="grid w-full max-w-[380px] gap-[22px]">
          {/* One row with the title, so the switch costs no height above «دخول» on phones. */}
          <div className="flex items-center justify-between gap-3">
            <Cartouche>{t.auth.loginTitle}</Cartouche>
            <LanguageSwitch />
          </div>
          <Tabs label={t.familyAuth.tabs.label} tabs={TABS} value={tab} onChange={setTab} idPrefix="login" className="mb-0" />
          <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="grid gap-[22px]">
            {tab === 'staff' ? <StaffPanel /> : <FamilyPanel />}
          </div>
          {tab === 'staff' && (
            <p className="border-t border-rule pt-4 text-xs text-pretty text-ink-3">{t.auth.guardiansNote}</p>
          )}
        </div>
      </div>
      <BindingCover />
    </main>
  );
}
