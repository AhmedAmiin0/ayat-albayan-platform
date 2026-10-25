import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { apiErrorText, moneyText, studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { deletePayment, type PaymentView } from './api';
import { ConfirmDialog } from './ConfirmDialog';
import { EditPaymentDialog } from './EditPaymentDialog';
import { AttachmentsDialog } from './AttachmentsDialog';
import type { PaymentAction } from './payment-columns';
import { ReceiptDialog } from './ReceiptDialog';

type Props = { payment: PaymentView; action: PaymentAction; onClose: () => void; onDone: (message: string) => void };

/** The dialog behind a payment row action: receipt, «المرفقات», edit, or delete after a confirm (audited by the API). */
export function PaymentDialogs({ payment, action, onClose, onDone }: Props) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deletePayment(payment.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onClose();
      onDone(t.finance.paymentDeleted);
    },
  });
  if (action === 'receipt') return <ReceiptDialog payment={payment} onClose={onClose} />;
  if (action === 'attachments') {
    return <AttachmentsDialog path={`/payments/${payment.id}/attachments`} description={studentLabel(payment.student)} onClose={onClose} />;
  }
  if (action === 'edit') return <EditPaymentDialog payment={payment} onClose={onClose} />;
  return (
    <ConfirmDialog
      title={t.finance.deletePaymentTitle}
      confirmLabel={t.common.delete}
      pending={remove.isPending}
      error={remove.isError ? apiErrorText(remove.error, t.payments.error) : null}
      onConfirm={() => remove.mutate()}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">
        {t.finance.deletePaymentBody
          .replace('{amount}', moneyText(payment.amount, payment.currency))
          .replace('{student}', studentLabel(payment.student))}
      </p>
    </ConfirmDialog>
  );
}
