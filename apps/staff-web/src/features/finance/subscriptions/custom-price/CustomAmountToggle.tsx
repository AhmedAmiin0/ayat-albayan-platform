import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const CUSTOM = 'custom';
const OPTIONS = [{ value: CUSTOM, label: t.paymentLinks.customAmount }];

interface Props { on: boolean; onChange: (on: boolean) => void }

/** Off keeps the calculator price for links, bank transfers and admin packages. */
export function CustomAmountToggle({ on, onChange }: Props) {
  return (
    <SegmentedControl
      label={t.paymentLinks.customAmount}
      options={OPTIONS}
      value={on ? CUSTOM : null}
      onChange={() => onChange(!on)}
    />
  );
}
