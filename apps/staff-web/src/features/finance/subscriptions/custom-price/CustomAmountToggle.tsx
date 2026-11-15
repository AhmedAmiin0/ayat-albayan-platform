import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';

const CUSTOM = 'custom';
const OPTIONS = [{ value: CUSTOM, label: t.paymentLinks.customAmount }];

interface Props { on: boolean; onChange: (on: boolean) => void }

/**
 * «مبلغ مخصص» (owner 2026-11-01) beside the discount pills, in their pill style: a pressed toggle.
 * On shows the amount box; off hides it and the calculator price stands (the payment link's amount
 * and, owner 2026-11-02, the package price of a bank transfer or an admin's package).
 */
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
