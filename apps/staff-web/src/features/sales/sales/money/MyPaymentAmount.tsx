import type { MyPaymentRow } from '@ab/money';
import { EditAmountDialog } from '@/features/finance/payments';
import { useMyPaymentAmount } from './use-my-payment-amount';

interface Props {
  payment: MyPaymentRow;
  onClose: () => void;
}

export function MyPaymentAmount({ payment, onClose }: Props) {
  const save = useMyPaymentAmount(payment.id);
  return <EditAmountDialog payment={payment} save={save} onClose={onClose} onDone={onClose} />;
}
