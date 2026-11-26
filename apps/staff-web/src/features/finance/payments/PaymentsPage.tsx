import { riyadhToday } from '@ab/time';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { TableBox } from '@/components/data-table/TableBox';
import {
  Button,
  Cartouche,
  EmptyState,
  FormAlert,
  Icon,
  PageHead,
  Pager,
  Toast,
  QueryState,
  t,
  HeadActions,
} from '@ab/web-kit';
import { downloadCsv } from '@/features/reporting/exports/api';
import { toSortSearch } from '@/lib/list/list-search';
import { filterParams, paymentsQuery, type PaymentFilters, type PaymentView } from './api';
import { paymentColumns, type PaymentAction } from './payment-columns';
import { PaymentDialogs } from './PaymentDialogs';
import { PeriodTotals } from './PeriodTotals';
import { RecordPaymentDialog } from './record/RecordPaymentDialog';
import { paymentsView, type PaymentsUrlSearch } from './search';
import { usePaymentFilters } from './use-payment-filters';
import { usePermissions } from '@/features/people/auth';

/** A filter or sort change goes back to page 1 (the route drops `page: undefined`). */
type Props = { search: PaymentsUrlSearch; onSearch: (patch: Partial<PaymentsUrlSearch>) => void };

/** «yyyy-01-01 … today»: a CSV needs a range; the filter's own, else this year so far. */
function csvRange(f: PaymentFilters): { from: string; to: string } {
  // academy day (docs/34 b): the CSV's ?from&to are Riyadh days
  const today = riyadhToday();
  const to = f.to ?? today;
  return { from: f.from ?? `${to.slice(0, 4)}-01-01`, to };
}

/** /admin/payments (R-PAY-01): filters and sort (URL), the period total, CSV, record / edit / delete, receipts. */
export function PaymentsPage({ search, onSearch }: Props) {
  const page = search.page ?? 1;
  const { filters, sort } = paymentsView(search);
  const list = useQuery(paymentsQuery(page, filters, sort));
  const [recording, setRecording] = useState(false);
  const [open, setOpen] = useState<{ payment: PaymentView; action: PaymentAction } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const csv = useMutation({
    mutationFn: () => downloadCsv({ kind: 'payments', params: { ...filterParams(filters), ...csvRange(filters) } }),
  });
  const canWrite = usePermissions().can('payments.write');
  const columns = useMemo(
    () => paymentColumns({ onAction: (payment, action) => setOpen({ payment, action }), canWrite }),
    [setOpen, canWrite],
  );
  const reset = (patch: Partial<PaymentsUrlSearch>) => onSearch({ ...patch, page: undefined });
  const items = list.data?.items ?? [];
  const extra = usePaymentFilters({ value: filters, studentName: items[0]?.student.name, onChange: reset });
  // A filter that matches nothing keeps the table (its toolbar and chips) on screen.
  const bare = list.data?.total === 0 && Object.keys(filterParams(filters)).length === 0;

  return (
    <>
      <PageHead>
        <Cartouche>{t.payments.title}</Cartouche>
        <HeadActions
          primary={
            <Button onClick={() => setRecording(true)}>
              <Icon name="plus" />
              {t.payments.record}
            </Button>
          }
          more={
            <Button type="button" variant="secondary" disabled={csv.isPending} onClick={() => csv.mutate()}>
              {t.payouts.exportCsv}
            </Button>
          }
        />
      </PageHead>
      {list.data && <PeriodTotals totals={list.data.totals} />}
      {csv.isError && <FormAlert>{t.common.error}</FormAlert>}
      <QueryState
        query={list}
        isEmpty={() => bare}
        empty={
          <TableBox center>
            <EmptyState title={t.payments.empty} />
          </TableBox>
        }
      >
        {(data) => (
        <>
          <DataTable
            fill
            stacked
            columns={columns}
            data={items}
            getRowId={(r) => r.id}
            emptyText={t.payments.empty}
            sort={{ key: sort.sort, dir: sort.dir, onChange: (next) => reset(toSortSearch(next)) }}
            filters={{ values: { method: search.f_method ?? '' }, onChange: (_, v) => reset({ f_method: (v || undefined) as PaymentFilters['method'] }) }}
            toolbar={{ extra, total: list.isPlaceholderData ? undefined : list.data?.total }}
          />
          <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={(p) => onSearch({ page: p > 1 ? p : undefined })} />
        </>
        )}
      </QueryState>
      {recording && (
        <RecordPaymentDialog
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            setToast(t.payments.saved);
          }}
        />
      )}
      {open && <PaymentDialogs payment={open.payment} action={open.action} onClose={() => setOpen(null)} onDone={setToast} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
