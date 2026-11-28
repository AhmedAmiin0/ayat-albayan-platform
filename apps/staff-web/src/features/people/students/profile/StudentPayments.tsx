import { useQuery } from '@tanstack/react-query';
import { QueryState, t } from '@ab/web-kit';
import { formatDate } from '@/features/sales/leads';
import { paymentsQuery } from '@/features/finance/payments';
import { Amount } from '@/features/finance/subscriptions';
import { moneyText } from '@/features/finance/subscriptions';

const row = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2 text-sm';

export function StudentPayments({ studentId }: { studentId: string }) {
  const list = useQuery(paymentsQuery(1, { studentId }));
  return (
    <QueryState
      query={list}
      rows={2}
      errorText={t.finance.studentPaymentsFailed}
      isEmpty={(data) => data.total === 0}
    >
      {(data) => (
        <section aria-labelledby="student-payments" className="mb-6 grid gap-2">
          <h3 id="student-payments" className="flex flex-wrap items-baseline gap-3 text-sm font-semibold">
            {t.finance.studentPayments}
            {data.totals.map((x) => (
              <span key={x.currency} className="text-xs font-normal text-ink-3">
                {t.finance.netPaid.replace('{amount}', moneyText(x.net, x.currency))}
              </span>
            ))}
          </h3>
          <ul className="grid gap-1">
            {data.items.map((p) => (
              <li key={p.id} className={row}>
                <span className="tabular-nums text-ink-2">{formatDate(p.paid_at)}</span>
                {p.kind === 'refund' && (
                  <span className="text-xs font-semibold text-danger">{t.enums.paymentKind.refund}</span>
                )}
                <Amount
                  amount={p.kind === 'refund' ? -p.amount : p.amount}
                  currency={p.currency}
                  className="font-semibold"
                />
                <span className="text-ink-2">{t.enums.paymentMethod[p.method]}</span>
                {p.original && (
                  <span className="text-xs text-ink-3">
                    {t.finance.sentAs.replace('{amount}', moneyText(p.original.amount, p.original.currency))}
                  </span>
                )}
                {p.note && <span className="text-xs text-ink-3">{p.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </QueryState>
  );
}
