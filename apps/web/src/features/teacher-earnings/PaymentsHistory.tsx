import type { TeacherPaymentView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { Pager } from '@/components/ui/pager';
import { apiErrorText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import type { FilterSearch, SortSearch } from '@/lib/list-search';
import { paymentsQuery, receiptUrl, type Scope } from './api';
import { teacherPaymentColumns } from './teacher-payment-columns';
import { VoidPaymentDialog } from './VoidPaymentDialog';

function Receipt({ scope, payment, onClose }: { scope: Scope; payment: TeacherPaymentView; onClose: () => void }) {
  const signed = useQuery({ queryKey: ['teacher-receipt', payment.id], queryFn: () => receiptUrl(scope, payment.id), staleTime: 30 * 60_000 });
  return (
    <Dialog title={t.payments.receipt} onClose={onClose} layout="center">
      {signed.isError && <FormAlert>{apiErrorText(signed.error, t.earnings.error)}</FormAlert>}
      {signed.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {signed.data && (
        <a href={signed.data.url} target="_blank" rel="noreferrer" className="text-sm text-lapis underline underline-offset-4">
          {t.payments.openReceipt}
        </a>
      )}
    </Dialog>
  );
}

/**
 * Payments made to the teacher (newest first unless sorted): server sort and filters (R-NFR-08)
 * kept in component state, since this page also holds the sessions table (one URL `sort` each
 * would clash).
 */
export function PaymentsHistory({ scope }: { scope: Scope }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortSearch>({});
  const [filters, setFilters] = useState<FilterSearch>({});
  const [receipt, setReceipt] = useState<TeacherPaymentView | null>(null);
  const [voiding, setVoiding] = useState<TeacherPaymentView | null>(null);
  const list = useQuery(paymentsQuery(scope, { page, sort, filters }));
  const admin = scope.kind === 'admin';
  const columns = useMemo(
    () => teacherPaymentColumns({ admin, onAction: (p, action) => (action === 'receipt' ? setReceipt(p) : setVoiding(p)) }),
    [admin],
  );
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...Object.fromEntries(Object.entries(f).filter(([k]) => k !== key)), ...(value.trim() ? { [key]: value.trim() } : {}) }));
    setPage(1);
  };
  // A filter that matches nothing keeps the table (and its filter row) on screen.
  const bare = list.data?.total === 0 && Object.keys(filters).length === 0;
  return (
    <section aria-label={t.earnings.history}>
      <h2 className="mb-3 text-base font-semibold text-ink">{t.earnings.history}</h2>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {bare && <p className="py-4 text-center text-ink-3">{t.earnings.noPayments}</p>}
      {list.data && !bare && (
        <DataTable
          stacked
          columns={columns}
          data={list.data.items}
          getRowId={(p) => p.id}
          emptyText={t.earnings.noPayments}
          sort={{ key: sort.sort, dir: sort.dir, onChange: (n) => (setSort(n.key ? { sort: n.key, ...(n.dir ? { dir: n.dir } : {}) } : {}), setPage(1)) }}
          filters={{ values: filters, onChange: onFilter }}
        />
      )}
      {list.data && <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />}
      {receipt && <Receipt scope={scope} payment={receipt} onClose={() => setReceipt(null)} />}
      {voiding && <VoidPaymentDialog payment={voiding} onClose={() => setVoiding(null)} />}
    </section>
  );
}
