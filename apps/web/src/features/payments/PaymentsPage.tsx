import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { Toast } from '@/components/ui/overlay/toast';
import { downloadCsv } from '@/features/exports/api';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { toSortSearch } from '@/lib/list/list-search';
import { filterParams, paymentsQuery, type PaymentFilters, type PaymentView } from './api';
import { paymentColumns, type PaymentAction } from './payment-columns';
import { PaymentDialogs } from './PaymentDialogs';
import { PeriodTotals } from './PeriodTotals';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { paymentsView, type PaymentsUrlSearch } from './search';
import { usePaymentFilters } from './use-payment-filters';
import { HeadActions } from '@/components/ui/layout/head-actions';

/** A filter or sort change goes back to page 1 (the route drops `page: undefined`). */
type Props = { search: PaymentsUrlSearch; onSearch: (patch: Partial<PaymentsUrlSearch>) => void };

/** «yyyy-01-01 … today»: a CSV needs a range; the filter's own, else this year so far. */
function csvRange(f: PaymentFilters): { from: string; to: string } {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
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
  const columns = useMemo(() => paymentColumns({ onAction: (payment, action) => setOpen({ payment, action }) }), [setOpen]);
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
      {(list.isError || csv.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {bare && <TableBox center><EmptyState title={t.payments.empty} /></TableBox>}
      {list.data && !bare && (
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
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={(p) => onSearch({ page: p > 1 ? p : undefined })} />
        </>
      )}
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
