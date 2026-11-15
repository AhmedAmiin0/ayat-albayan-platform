import { AGING_BUCKETS } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { downloadCsv } from '@/features/reporting/exports/api';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import { receivablesQuery } from './api';
import { receivableColumns } from './receivable-columns';

/** /admin/receivables «مستحق على الطلاب»: who owes, how much, days since the package started, aging; CSV; every column sorts and filters. */
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
          {v.fx_missing.length > 0 && <p className="text-xs text-act">{t.finance.fxMissing.replace('{currencies}', v.fx_missing.join(t.common.listSeparator))}</p>}
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
      {v && v.rows.length > 0 && (
        <DataTable stacked clientSort clientFilter columns={receivableColumns} data={v.rows} getRowId={(r) => r.id} />
      )}
    </>
  );
}
