import { AGING_BUCKETS } from '@ab/money';
import { DataTable } from '@/components/data-table/DataTable';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Amount } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ReceivablesView } from './api';
import { receivableColumns } from './receivable-columns';

/** The loaded receivables: the owed total with its aging per currency, then the table. */
export function ReceivablesBody({ view: v }: { view: ReceivablesView }) {
  return (
    <>
      <section className="mb-6 grid gap-2" aria-label={t.finance.owedTotal}>
        <p className="flex flex-wrap items-baseline gap-3">
          <span className="text-sm text-ink-3">{t.finance.owedTotal}</span>
          <Amount amount={v.total} currency={v.currency} className="text-xl font-semibold" />
        </p>
        {v.fx_missing.length > 0 && (
          <p className="text-xs text-act">
            {t.finance.fxMissing.replace('{currencies}', v.fx_missing.join(t.common.listSeparator))}
          </p>
        )}
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
      {v.rows.length === 0 ? (
        <EmptyState title={t.finance.noReceivables} />
      ) : (
        <DataTable
          stacked
          clientSort
          clientFilter
          columns={receivableColumns}
          data={v.rows}
          getRowId={(r) => r.id}
        />
      )}
    </>
  );
}
