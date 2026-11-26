import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/features/finance/payments/record/ConfirmDialog';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiErrorText, moneyText } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit';
import { voidTeacherPayment, type TeacherPaymentView } from '@/features/finance/teacher-earnings/api';

/** Voided with a reason, never deleted; its sessions are owed again and a paid payout reverts. */
export function VoidPaymentDialog({
  payment,
  onClose,
}: {
  payment: TeacherPaymentView;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (reason: string) => voidTeacherPayment(payment.id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onClose();
    },
  });
  return (
    <ConfirmDialog
      title={t.finance.voidTitle}
      confirmLabel={t.finance.voidPayment}
      withReason
      pending={save.isPending}
      error={
        save.isError ? apiErrorText(save.error, { ...t.earnings.error, ...t.finance.error }) : null
      }
      onConfirm={(reason) => save.mutate(reason)}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">{t.finance.voidBody.replace('{amount}', moneyText(payment.amount, 'EGP'))}</p>
    </ConfirmDialog>
  );
}
