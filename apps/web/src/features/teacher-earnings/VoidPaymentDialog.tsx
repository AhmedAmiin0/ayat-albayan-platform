import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/features/payments/record/ConfirmDialog';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { apiErrorText, moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { voidTeacherPayment, type TeacherPaymentView } from './api';

/**
 * «إلغاء الدفعة»: a wrong transfer is voided with a reason, never deleted. Its sessions are owed
 * again and it stays in the history struck through (and a monthly payout it paid goes back to approved).
 */
export function VoidPaymentDialog({ payment, onClose }: { payment: TeacherPaymentView; onClose: () => void }) {
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
      error={save.isError ? apiErrorText(save.error, { ...t.earnings.error, ...t.finance.error }) : null}
      onConfirm={(reason) => save.mutate(reason)}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">{t.finance.voidBody.replace('{amount}', moneyText(payment.amount, 'EGP'))}</p>
    </ConfirmDialog>
  );
}
