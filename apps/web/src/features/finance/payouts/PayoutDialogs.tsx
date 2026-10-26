import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/features/finance/payments/record/ConfirmDialog';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiErrorText, moneyText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { reopenPayout, unpayPayout, type PayoutView } from './api';
import { PayPayoutDialog } from './PayPayoutDialog';
import { teacherLabel } from '@/lib/i18n/teacher-label';

export type PayoutDialog = { payout: PayoutView; kind: 'pay' | 'reopen' | 'unpay' };

/** The dialog behind a payout row action: pay (confirm + receipt), reopen, un-pay (with a reason). */
export function PayoutDialogs({ open, onClose }: { open: PayoutDialog; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { payout, kind } = open;
  const fix = useMutation({
    mutationFn: (reason: string) => (kind === 'unpay' ? unpayPayout(payout.id, reason) : reopenPayout(payout.id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onClose();
    },
  });
  if (kind === 'pay') return <PayPayoutDialog payout={payout} onClose={onClose} onSaved={onClose} />;
  const name = teacherLabel(payout.teacher);
  return (
    <ConfirmDialog
      title={kind === 'unpay' ? t.finance.unpayTitle.replace('{teacher}', name) : t.finance.reopenTitle.replace('{teacher}', name)}
      confirmLabel={kind === 'unpay' ? t.finance.unpay : t.finance.reopen}
      withReason={kind === 'unpay'}
      pending={fix.isPending}
      error={fix.isError ? apiErrorText(fix.error, { ...t.payouts.error, ...t.earnings.error }) : null}
      onConfirm={(reason) => fix.mutate(reason)}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">
        {(kind === 'unpay' ? t.finance.unpayBody : t.finance.reopenBody).replace('{amount}', moneyText(payout.amount, 'EGP'))}
      </p>
    </ConfirmDialog>
  );
}
