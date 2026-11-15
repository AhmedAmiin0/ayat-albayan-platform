import type { MyPaymentRow } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { salesAmountEditable } from '@/features/finance/payments';
import { t } from '@/lib/i18n/i18n';

export interface MyPaymentHandlers {
  onAttachments: (p: MyPaymentRow) => void;
  /** «تعديل المبلغ» (subscriptions.edit_terms); null without the permission. */
  onEditAmount: ((p: MyPaymentRow) => void) | null;
}

type Props = MyPaymentHandlers & { payment: MyPaymentRow };

/**
 * A row of «مدفوعاتي»: «عرض المرفقات», and «تعديل المبلغ» with the permission on a payment (never a
 * refund, never a card one: its amount is Stripe's).
 */
export function MyPaymentActions({ payment, onAttachments, onEditAmount }: Props) {
  const name = payment.student.name;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button type="button" variant="secondary" size="sm" aria-label={`${t.payments.viewAttachments} ${name}`} onClick={() => onAttachments(payment)}>
        {t.payments.viewAttachments}
      </Button>
      {onEditAmount && salesAmountEditable(payment) && (
        <Button type="button" variant="ghost" size="sm" aria-label={`${t.payments.editAmount.action} ${name}`} onClick={() => onEditAmount(payment)}>
          {t.payments.editAmount.action}
        </Button>
      )}
    </div>
  );
}
