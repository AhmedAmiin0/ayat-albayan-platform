import type { PayoutView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { financeErrorText } from '../shared/errors';
import { amountText } from '../shared/format';
import { payoutActions } from './payout-actions';
import { monthLabel } from '@/teacher/payout-text';
import { openPayoutReceipt } from '../shared/receipt-link';
import { UnpayConfirm } from './UnpayConfirm';
import { usePayoutMove } from './use-payout-move';

type Move = 'approve' | 'reopen' | 'unpay';
export interface PayoutActionBarProps {
  payout: PayoutView;
  onPay: () => void;
  onDone: (move: Move) => void;
}

/** The web's actions for the state: approve and reopen ask once; unpay asks why; pay opens the form. */
export function PayoutActionBar({ payout, onPay, onDone }: PayoutActionBarProps) {
  const [asking, setAsking] = useState<Move | null>(null);
  const [receiptError, setReceiptError] = useState(false);
  const move = usePayoutMove();
  const amount = amountText(payout.amount);
  const run = (m: Move, reason = '') =>
    move.mutate(m === 'unpay' ? { id: payout.id, move: m, reason } : { id: payout.id, move: m }, {
      onSuccess: () => {
        setAsking(null);
        onDone(m);
      },
    });
  const asks: Record<Move, string> = {
    approve: t.mobileFinance.payouts.approveAsk
      .replace('{teacher}', payout.teacher.display_name_ar)
      .replace('{month}', monthLabel(payout.month))
      .replace('{amount}', amount),
    reopen: t.finance.reopenBody.replace('{amount}', amount),
    unpay: t.finance.unpayBody.replace('{amount}', amount),
  };
  const cancel = () => {
    move.reset();
    setAsking(null);
  };
  if (asking === 'unpay') {
    return (
      <View style={{ gap: 8 }}>
        <UnpayConfirm message={asks.unpay} busy={move.isPending} onConfirm={(reason) => run('unpay', reason)} onCancel={cancel} />
        {move.isError ? <ErrorLine message={financeErrorText(move.error)} /> : null}
      </View>
    );
  }
  if (asking) {
    const label = asking === 'approve' ? t.payouts.approve : t.finance.reopen;
    return (
      <View style={{ gap: 8 }}>
        <InlineConfirm message={asks[asking]} confirmLabel={label} busy={move.isPending} onConfirm={() => run(asking)} onCancel={cancel} />
        {move.isError ? <ErrorLine message={financeErrorText(move.error)} /> : null}
      </View>
    );
  }
  const button = {
    approve: <Button key="approve" label={t.payouts.approve} onPress={() => setAsking('approve')} />,
    pay: <Button key="pay" label={t.finance.confirmPaid} onPress={onPay} />,
    reopen: <Button key="reopen" variant="ghost" label={t.finance.reopen} onPress={() => setAsking('reopen')} />,
    unpay: <Button key="unpay" variant="ghost" label={t.finance.unpay} onPress={() => setAsking('unpay')} />,
    receipt: (
      <Button
        key="receipt"
        variant="secondary"
        label={t.earnings.viewReceipt}
        onPress={() => {
          setReceiptError(false);
          openPayoutReceipt(payout.id).catch(() => setReceiptError(true));
        }}
      />
    ),
  };
  return (
    <View style={{ gap: 8 }}>
      {payoutActions(payout).map((a) => button[a])}
      {receiptError ? <ErrorLine message={t.mobileFinance.payouts.receiptFailed} /> : null}
    </View>
  );
}
