import type { AcademySettings } from '@ab/shared';
import { Section } from '@/components/settings/Section';
import { matchesSetting } from '@/components/settings/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { SalesAutoAssignSwitch } from '@/features/sales/SalesAutoAssignSwitch';
import { t } from '@/lib/i18n';

/** «فريق المبيعات»: the auto-assign switch, which saves on its own. */
export function SalesSection({ settings }: { settings: AcademySettings }) {
  const { query } = useSettingsView();
  if (!matchesSetting('sales_auto_assign', query)) return null;
  return (
    <Section id="sales" title={t.settings.sections.sales}>
      <SalesAutoAssignSwitch settings={settings} />
    </Section>
  );
}
