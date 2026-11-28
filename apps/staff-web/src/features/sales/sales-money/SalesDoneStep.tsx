import type { SalesPaymentView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants, Dialog, t } from '@ab/web-kit';
import { Amount } from '@/features/finance/subscriptions';
import { studentLabel } from '@/features/finance/subscriptions';

/** `onBookCourse` books the course days for the paid package's student. */
interface Props {
  payment: SalesPaymentView;
  onClose: () => void;
  onBookCourse?: (() => void) | undefined;
}

/** The transfer is recorded and counts at once (R-ASST-04). */
export function SalesDoneStep({ payment, onClose, onBookCourse }: Props) {
  const title =
    payment.student.status === 'active'
      ? t.salesMoney.becameSubscribed
      : t.salesMoney.transferSaved;
  return (
    <Dialog
      title={title}
      onClose={onClose}
      compact
      actions={
        <>
          <Link
            to="/sales/earnings"
            search={{ view: 'payments' }}
            className={buttonVariants({ variant: 'secondary' })}
          >
            {t.salesMoney.openMyPayments}
          </Link>
          {onBookCourse && (
            <Button type="button" variant="secondary" onClick={onBookCourse}>
              {t.booking.bookCourseDays}
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            {t.salesMoney.done}
          </Button>
        </>
      }
    >
      <p role="status" className="flex flex-wrap items-baseline gap-2 text-sm text-ink-2">
        <span className="font-semibold text-ink">{studentLabel(payment.student)}</span>
        <Amount amount={payment.amount} currency={payment.currency} />
      </p>
    </Dialog>
  );
}
