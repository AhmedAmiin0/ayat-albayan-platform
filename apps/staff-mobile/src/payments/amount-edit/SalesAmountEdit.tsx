import type { MyPaymentRow } from '@ab/shared';
import { useHolds } from '@ab/mobile-kit';
import { salesAmountEditable } from './amount-edit';
import { EditAmountButton } from './EditAmountButton';
import { useSalesAmountEdit } from './use-amount-edit';

/** Needs subscriptions.edit_terms; never on a card payment. */
export function SalesAmountEdit({ payment }: { payment: MyPaymentRow }) {
  const allowed = useHolds('subscriptions.edit_terms');
  const edit = useSalesAmountEdit(payment.id);
  if (!allowed || !salesAmountEditable(payment)) return null;
  return <EditAmountButton payment={payment} edit={edit} />;
}
