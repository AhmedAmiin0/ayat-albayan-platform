import type { MyPaymentRow } from '@ab/shared';
import { useHolds } from '@/core/auth/use-permissions';
import { salesAmountEditable } from './amount-edit';
import { EditAmountButton } from './EditAmountButton';
import { useSalesAmountEdit } from './use-amount-edit';

/** «تعديل المبلغ» on «مدفوعاتي» with payments.edit_amount: a payment, never a card one. */
export function SalesAmountEdit({ payment }: { payment: MyPaymentRow }) {
  const allowed = useHolds('payments.edit_amount');
  const edit = useSalesAmountEdit(payment.id);
  if (!allowed || !salesAmountEditable(payment)) return null;
  return <EditAmountButton payment={payment} edit={edit} />;
}
