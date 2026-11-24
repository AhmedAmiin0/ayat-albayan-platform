import type { MyPaymentRow } from '@ab/money';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { salesAmountEditable } from '@/features/finance/payments';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface MyPaymentHandlers {
  onAttachments: (p: MyPaymentRow) => void;
  /** Needs subscriptions.edit_terms; null without the permission. */
  onEditAmount: ((p: MyPaymentRow) => void) | null;
}

type Props = MyPaymentHandlers & { payment: MyPaymentRow };

/** Amount edit with the permission, never on a refund or a card payment (Stripe's amount). */
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
