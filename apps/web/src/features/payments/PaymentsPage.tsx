import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { downloadCsv } from '@/features/exports/api';
import { ListSkeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { filterParams, paymentsQuery, type PaymentFilters, type PaymentView } from './api';
import { paymentColumns, type PaymentAction } from './payment-columns';
import { PaymentDialogs } from './PaymentDialogs';
import { PaymentFiltersBar } from './PaymentFiltersBar';
import { PeriodTotals } from './PeriodTotals';
import { RecordPaymentDialog } from './RecordPaymentDialog';

type Props = { page: number; onPage: (page: number) => void };

/** «yyyy-01-01 … today»: a CSV needs a range; the filter's own, else this year so far. */
function csvRange(f: PaymentFilters): { from: string; to: string } {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  const to = f.to ?? today;
  return { from: f.from ?? `${to.slice(0, 4)}-01-01`, to };
}

/** /admin/payments (R-PAY-01): filters, the period total, CSV, record / edit / delete, receipts. */
export function PaymentsPage({ page, onPage }: Props) {
  const [filters, setFilters] = useState<PaymentFilters>({});
  const list = useQuery(paymentsQuery(page, filters));
  const [recording, setRecording] = useState(false);
  const [open, setOpen] = useState<{ payment: PaymentView; action: PaymentAction } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const csv = useMutation({
    mutationFn: () => downloadCsv({ kind: 'payments', params: { ...filterParams(filters), ...csvRange(filters) } }),
  });
  const columns = useMemo(() => paymentColumns({ onAction: (payment, action) => setOpen({ payment, action }) }), []);
  const onFilters = (next: PaymentFilters) => {
    setFilters(next);
    onPage(1);
  };

  return (
    <>
      <PageHead>
        <Cartouche>{t.payments.title}</Cartouche>
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Button type="button" variant="secondary" disabled={csv.isPending} onClick={() => csv.mutate()}>
            {t.payouts.exportCsv}
          </Button>
          <Button onClick={() => setRecording(true)}>
            <Icon name="plus" />
            {t.payments.record}
          </Button>
        </div>
      </PageHead>
      <PaymentFiltersBar value={filters} onChange={onFilters} />
      {list.data && <PeriodTotals totals={list.data.totals} />}
      {(list.isError || csv.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.data?.total === 0 && <TableBox center><EmptyState title={t.payments.empty} /></TableBox>}
      {list.data && list.data.total > 0 && (
        <>
          <DataTable fill stacked columns={columns} data={list.data.items} getRowId={(r) => r.id} />
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={onPage} />
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
