import type { PaymentView } from '@ab/shared';
import { useHolds } from '@ab/mobile-kit';
import { amountEditable } from './amount-edit';
import { EditAmountButton } from './EditAmountButton';
import { useAdminAmountEdit } from './use-amount-edit';

/** Needs payments.write; never on a card (Stripe) payment. */
export function AdminAmountEdit({ payment }: { payment: PaymentView }) {
  const allowed = useHolds('payments.write');
  const edit = useAdminAmountEdit(payment);
  if (!allowed || !amountEditable(payment)) return null;
  return <EditAmountButton payment={payment} edit={edit} />;
}
