import type { UseMutationResult } from '@tanstack/react-query';
import { apiErrorText, moneyText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { ConfirmDialog } from '@/features/finance/payments/record/ConfirmDialog';
import type { AmountTarget } from './amount-check';

const T = t.payments.editAmount;

interface Props {
  payment: AmountTarget;
  amount: number;
  save: UseMutationResult<unknown, Error, number>;
  onClose: () => void;
  onDone: () => void;
}

/** «تأكيد تعديل المبلغ»: old → new, then the write; an API refusal is said in the dialog. */
export function AmountConfirm({ payment, amount, save, onClose, onDone }: Props) {
  const body = T.confirmBody
    .replace('{old}', moneyText(payment.amount, payment.currency))
    .replace('{new}', moneyText(amount, payment.currency));
  // t.payments.error wins: its refund_exceeds_paid says the amount edit's own case.
  const errors = { ...t.finance.error, ...t.payments.error };
  return (
    <ConfirmDialog
      title={T.confirmTitle}
      confirmLabel={T.confirm}
      pending={save.isPending}
      error={save.isError ? apiErrorText(save.error, errors) : null}
      onConfirm={() => save.mutate(amount, { onSuccess: onDone })}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">{body}</p>
    </ConfirmDialog>
  );
}
