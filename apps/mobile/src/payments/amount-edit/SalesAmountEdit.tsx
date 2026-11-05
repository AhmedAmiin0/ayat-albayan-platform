import type { MyPaymentRow } from '@ab/shared';
import { useHolds } from '@/core/auth/use-permissions';
import { salesAmountEditable } from './amount-edit';
import { EditAmountButton } from './EditAmountButton';
import { useSalesAmountEdit } from './use-amount-edit';

/** «تعديل المبلغ» on «مدفوعاتي» with subscriptions.edit_terms: a payment, never a card one. */
export function SalesAmountEdit({ payment }: { payment: MyPaymentRow }) {
  const allowed = useHolds('subscriptions.edit_terms');
  const edit = useSalesAmountEdit(payment.id);
  if (!allowed || !salesAmountEditable(payment)) return null;
  return <EditAmountButton payment={payment} edit={edit} />;
}
