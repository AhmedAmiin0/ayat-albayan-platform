import { t, FilterPills, type FilterPill } from '@ab/mobile-kit';
import type { AppearancePref } from '@ab/mobile-kit';
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
