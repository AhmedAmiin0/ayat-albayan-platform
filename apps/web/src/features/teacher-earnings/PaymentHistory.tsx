import { StatusChip } from '@/components/ui/status-chip';
import { formatDate } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import type { TeacherPaymentView } from './api';
import { ReceiptLink } from './ReceiptLink';

type Props = { payments: TeacherPaymentView[]; teacherId?: string };

/** «سجل المدفوعات»: newest first. The receipt link is the admin's (`teacherId` given); the teacher sees none. */
export function PaymentHistory({ payments, teacherId }: Props) {
  const tt = t.teacherEarnings;
  return (
    <section aria-label={tt.paymentsTitle} className="mb-8">
      <h2 className="mb-2 font-display text-lg text-ink">{tt.paymentsTitle}</h2>
      {payments.length === 0 ? (
        <p className="py-4 text-center text-ink-3">{tt.paymentsEmpty}</p>
      ) : (
        <ul className="grid">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule py-3 text-sm">
              <Amount amount={p.amount} currency={p.currency} className="font-semibold text-ink" />
              <span className="text-ink-2">{formatDate(p.paid_at)}</span>
              <span className="text-ink-2">{t.enums.paymentMethod[p.method]}</span>
              {p.from_payout && <StatusChip size="sm" tone="neutral" glyph="fill" label={tt.fromPayout} />}
              <span className="text-xs text-ink-3">{tt.sessionsCount.replace('{n}', String(p.sessions))}</span>
              {p.note && <span className="text-xs text-ink-3">{p.note}</span>}
              {teacherId && p.has_receipt && <ReceiptLink teacherId={teacherId} paymentId={p.id} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
