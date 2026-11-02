import { t } from '@/core/lib/i18n/i18n';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import type { AppearancePref } from './appearance';
import { Section } from '@/core/ui/surface/Section';
import { useAppearancePref } from './useAppearancePref';

const appearancePills = (): readonly FilterPill<AppearancePref>[] => [
  { value: 'auto', label: t.theme.auto },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

/** «المظهر»: تلقائي / فاتح / ليلي, saved on the device. */
export function AppearancePicker() {
  const [pref, choose] = useAppearancePref();
  return (
    <Section title={t.theme.label}>
      <FilterPills
        items={appearancePills()}
        value={pref}
        onChange={choose}
        accessibilityLabel={t.theme.label}
        role="radiogroup"
      />
    </Section>
  );
}
