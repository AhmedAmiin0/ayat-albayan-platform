import type { AppearancePref } from '../../../lib/appearance/appearance';
import { useAppearancePref } from '../../../lib/appearance/useAppearancePref';
import { t } from '../../../lib/i18n/i18n';
import { Section } from '../../surface/Section';
import { type FilterPill, FilterPills } from '../FilterPills';

const appearancePills = (): readonly FilterPill<AppearancePref>[] => [
  { value: 'auto', label: t.theme.auto },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

/** Saved on the device. */
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
