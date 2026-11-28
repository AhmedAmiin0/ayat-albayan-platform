import { Section } from '../../surface/Section';
import { FilterPills } from '../FilterPills';
import { useAppearancePicker } from './use-appearance-picker';

/**
 * The brand pills as radios. iOS keeps them too: its segmented control speaks its options as
 * buttons, not as the radio group the pills are.
 */
export function AppearancePicker() {
  const { pref, choose, items, label } = useAppearancePicker();
  return (
    <Section title={label}>
      <FilterPills
        items={items}
        value={pref}
        onChange={choose}
        accessibilityLabel={label}
        role="radiogroup"
      />
    </Section>
  );
}
