import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/features/leads/format';
import { paymentsQuery } from '@/features/payments/api';
import { Amount } from '@/features/subscriptions/balance/Amount';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';

/**
 * «المدفوعات» on the student's profile: every payment and refund of the student's packages, newest
 * first (the first page), with the net total. Nothing while there are none.
 */
export function StudentPayments({ studentId }: { studentId: string }) {
  const list = useQuery(paymentsQuery(1, { studentId }));
  if (!list.data || list.data.total === 0) return null;
  return (
    <section aria-labelledby="student-payments" className="mb-6 grid gap-2">
      <h3 id="student-payments" className="flex flex-wrap items-baseline gap-3 text-sm font-semibold">
        {t.finance.studentPayments}
        {list.data.totals.map((x) => (
          <span key={x.currency} className="text-xs font-normal text-ink-3">
            {t.finance.netPaid.replace('{amount}', moneyText(x.net, x.currency))}
          </span>
        ))}
      </h3>
      <ul className="grid gap-1">
        {list.data.items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2 text-sm">
            <span className="tabular-nums text-ink-2">{formatDate(p.paid_at)}</span>
            {p.kind === 'refund' && <span className="text-xs font-semibold text-danger">{t.enums.paymentKind.refund}</span>}
            <Amount amount={p.kind === 'refund' ? -p.amount : p.amount} currency={p.currency} className="font-semibold" />
            <span className="text-ink-2">{t.enums.paymentMethod[p.method]}</span>
            {p.original && <span className="text-xs text-ink-3">{t.finance.sentAs.replace('{amount}', moneyText(p.original.amount, p.original.currency))}</span>}
            {p.note && <span className="text-xs text-ink-3">{p.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
