import type { PaymentView } from '@ab/shared';
import { useHolds } from '@/core/auth/use-permissions';
import { amountEditable } from './amount-edit';
import { EditAmountButton } from './EditAmountButton';
import { useAdminAmountEdit } from './use-amount-edit';

/** «تعديل المبلغ» on «كل المدفوعات» (payments.write): never on a card (Stripe) payment. */
export function AdminAmountEdit({ payment }: { payment: PaymentView }) {
  const allowed = useHolds('payments.write');
  const edit = useAdminAmountEdit(payment);
  if (!allowed || !amountEditable(payment)) return null;
  return <EditAmountButton payment={payment} edit={edit} />;
}
