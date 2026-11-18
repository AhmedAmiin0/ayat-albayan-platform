import type { PortalKind } from '@ab/shared';
import { LanguageSegments } from '@ab/web-kit/components/shell/LanguageSegments';
import { ThemeToggle } from '@ab/web-kit/components/ui/layout/theme-toggle';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { PushRow } from '@ab/web-kit/family/settings/PushRow';
import { SettingRow } from '@ab/web-kit/family/settings/SettingRow';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const PUSH_HINT: Record<PortalKind, string> = {
  guardian: t.portal.app.account.pushGuardian,
  student: t.portal.app.account.pushStudent,
};

/** «الإعدادات» (boards: «حسابي»): this browser's notifications, the theme and the language. */
export function SettingsCard({ kind }: { kind: PortalKind }) {
  return (
    <FamilyCard as="section" tone="gold" labelledBy="account-settings">
      <h2 id="account-settings" className="text-[22px] font-extrabold text-ink">
        {t.portal.app.account.settings}
      </h2>
      <div className="grid divide-y divide-rule">
        <PushRow hint={PUSH_HINT[kind]} />
        <SettingRow icon="sun" tone="gold" title={t.theme.label} control={<ThemeToggle pill />} />
        <SettingRow icon="globe" tone="teal" title={t.language.label}
          control={<LanguageSegments pill />} />
      </div>
    </FamilyCard>
  );
}
