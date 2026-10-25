import type { SalesPaymentView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Amount } from '@/features/subscriptions/Amount';
import { studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';

/** `onBookCourse`: «احجز أيام الحلقات الآن» for the paid package's student (owner 2026-10-18). */
type Props = { payment: SalesPaymentView; onClose: () => void; onBookCourse?: (() => void) | undefined };

/**
 * The transfer is recorded and counts at once (R-ASST-04): «أصبح الطالب مشتركًا» when the student is
 * active now, else «تم تسجيل التحويل»; «مدفوعاتي» is the payments filter of «أرباحي».
 */
export function SalesDoneStep({ payment, onClose, onBookCourse }: Props) {
  const title = payment.student.status === 'active' ? t.salesMoney.becameSubscribed : t.salesMoney.transferSaved;
  return (
    <Dialog
      title={title}
      onClose={onClose}
      compact
      actions={
        <>
          <Link to="/sales/earnings" search={{ view: 'payments' }} className={buttonVariants({ variant: 'secondary' })}>
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
