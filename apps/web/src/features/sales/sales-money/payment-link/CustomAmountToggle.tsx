import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import type { LinkPay } from './use-link-pay';

const CUSTOM = 'custom';
const OPTIONS = [{ value: CUSTOM, label: t.paymentLinks.customAmount }];

/**
 * «مبلغ مخصص» (owner 2026-11-01) beside the discount pills, in their pill style: a pressed
 * toggle. On shows the amount box; off hides it and the link carries the calculator price after
 * the pill.
 */
export function CustomAmountToggle({ pay }: { pay: LinkPay }) {
  return (
    <SegmentedControl
      label={t.paymentLinks.customAmount}
      options={OPTIONS}
      value={pay.custom ? CUSTOM : null}
      onChange={() => pay.setCustom(!pay.custom)}
    />
  );
}
