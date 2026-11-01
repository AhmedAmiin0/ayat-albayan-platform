import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { PayoutView } from '@/features/finance/payouts/api';
import type { PayoutAction } from './payout-columns';

type Props = { payout: PayoutView; onAction: (action: PayoutAction) => void };

/** draft → «اعتماد»; approved → «تم الدفع» / «إعادة فتح»; paid → «الإيصال» / «إلغاء الدفع». */
export function PayoutActions({ payout, onAction }: Props) {
  const btn = (action: PayoutAction, label: string, variant: 'secondary' | 'ghost' = 'secondary') => (
    <Button key={action} type="button" variant={variant} size="sm" onClick={() => onAction(action)}>
      {label}
    </Button>
  );
  if (payout.status === 'draft') return btn('approve', t.payouts.approve);
  if (payout.status === 'approved')
    return <div className="flex flex-wrap gap-1.5">{[btn('pay', t.payouts.markPaid), btn('reopen', t.finance.reopen, 'ghost')]}</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {payout.has_receipt && btn('receipt', t.earnings.viewReceipt)}
      {btn('unpay', t.finance.unpay, 'ghost')}
    </div>
  );
}
