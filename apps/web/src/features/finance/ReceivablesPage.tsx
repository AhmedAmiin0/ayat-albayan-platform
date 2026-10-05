import { AGING_BUCKETS } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { downloadCsv } from '@/features/exports/api';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { receivablesQuery } from './api';

/** /admin/receivables «مستحق على الطلاب»: who owes, how much, days since the package started, aging; CSV. */
export function ReceivablesPage() {
  const q = useQuery(receivablesQuery);
  const csv = useMutation({ mutationFn: () => downloadCsv({ kind: 'receivables' }) });
  const v = q.data;
  return (
    <>
      <PageHead>
        <Cartouche>{t.finance.receivablesTitle}</Cartouche>
        <div className="ms-auto">
          <Button type="button" variant="secondary" disabled={csv.isPending} onClick={() => csv.mutate()}>
            {t.payouts.exportCsv}
          </Button>
        </div>
      </PageHead>
      {(q.isError || csv.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {q.isPending && <p className="py-6 text-center text-ink-3">{t.common.loading}</p>}
      {v && (
        <section className="mb-6 grid gap-2" aria-label={t.finance.owedTotal}>
          <p className="flex flex-wrap items-baseline gap-3">
            <span className="text-sm text-ink-3">{t.finance.owedTotal}</span>
            <Amount amount={v.total} currency={v.currency} className="text-xl font-semibold" />
          </p>
          {v.fx_missing.length > 0 && <p className="text-xs text-act">{t.finance.fxMissing.replace('{currencies}', v.fx_missing.join('، '))}</p>}
          {v.totals.map((x) => (
            <p key={x.currency} className="flex flex-wrap gap-x-4 text-xs text-ink-2">
              <Amount amount={x.owed} currency={x.currency} className="font-semibold" />
              {AGING_BUCKETS.map((b) => (
                <span key={b}>
                  {t.finance.aging[b]}: <Amount amount={x.buckets[b]} currency={x.currency} />
                </span>
              ))}
            </p>
          ))}
        </section>
      )}
      {v?.rows.length === 0 && <EmptyState title={t.finance.noReceivables} />}
      <ul className="grid divide-y divide-rule">
        {v?.rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 py-2.5 text-sm">
            <Link to="/admin/students/$studentId" params={{ studentId: r.student.id }} className="min-w-40 font-semibold text-ink hover:underline">
              {r.student.name}
            </Link>
            <span className="text-ink-3">{r.guardian?.name}</span>
            <span>
              {t.finance.owed}: <Amount amount={r.owed} currency={r.currency} className="font-semibold" />
            </span>
            <span className="text-ink-3">{t.payments.paidOf.replace('{paid}', String(r.paid)).replace('{price}', String(r.price))}</span>
            <span className={r.days_overdue > 60 ? 'font-semibold text-act' : 'text-ink-2'}>
              {t.finance.daysLate.replace('{count}', String(r.days_overdue))} · {t.finance.aging[r.bucket]}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
