import type { MyPaymentRow } from '@ab/shared';
import { EditAmountDialog } from '@/features/finance/payments';
import { useMyPaymentAmount } from './use-my-payment-amount';

interface Props {
  payment: MyPaymentRow;
  onClose: () => void;
}

/** «تعديل المبلغ» on one of «مدفوعاتي»: the admin's dialog, with her own write. */
export function MyPaymentAmount({ payment, onClose }: Props) {
  const save = useMyPaymentAmount(payment.id);
  return <EditAmountDialog payment={payment} save={save} onClose={onClose} onDone={onClose} />;
}
