import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { RecordPaymentDialog } from '@/features/payments/RecordPaymentDialog';
import { t } from '@/lib/i18n';
import { clearFilterSearch, toFilterSearch, toSortSearch } from '@/lib/list-search';
import { invoiceDownload, invoicesQuery, type InvoiceView } from './api';
import { invoiceColumns } from './invoice-columns';
import { invoicesList, type InvoicesUrlSearch } from './search';
import { invoiceRangeFilters } from './invoice-range-filters';

type Props = {
  search: InvoicesUrlSearch;
  /** A patch of the URL search (the route re-validates it); `page: undefined` = page 1. */
  onSearch: (patch: Record<string, unknown>) => void;
};

/** /admin/invoices: every booking invoice (R-PAY-03); range, sort and filters in the URL; open or «سجّل كدفعة». */
export function InvoicesPage({ search, onSearch }: Props) {
  const q = invoicesList(search);
  const list = useQuery(invoicesQuery(q));
  const [paying, setPaying] = useState<InvoiceView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const open = useMutation({ mutationFn: invoiceDownload, onSuccess: (r) => void window.open(r.url, '_blank', 'noopener') });
  const openFile = open.mutate;
  const columns = useMemo(
    () => invoiceColumns({ onAction: (i, action) => (action === 'open' ? openFile(i.id) : setPaying(i)) }),
    [openFile],
  );
  const reset = (patch: Record<string, unknown>) => onSearch({ ...patch, page: undefined });
  const filterValues = { student: search.f_student ?? '', kind: search.f_kind ?? '' };
  const extra = invoiceRangeFilters({ search, onChange: reset });
  // A filter that matches nothing keeps the table (its toolbar and chips) on screen.
  const bare = list.data?.total === 0 && !search.from && !search.to && Object.keys(q.filters).length === 0;
  const student = paying?.students[0];
  return (
    <>
      <PageHead>
        <Cartouche>{t.finance.invoicesTitle}</Cartouche>
      </PageHead>
      {(list.isError || open.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {bare && <EmptyState title={t.finance.noInvoices} />}
      {list.data && !bare && (
        <DataTable
          stacked
          columns={columns}
          data={list.data.items}
          getRowId={(i) => i.id}
          emptyText={t.finance.noInvoices}
          sort={{ key: q.sort.sort, dir: q.sort.dir, onChange: (next) => reset(toSortSearch(next)) }}
          filters={{ values: filterValues, onChange: (key, v) => reset(toFilterSearch(key, v)), onClear: (keys) => reset(clearFilterSearch(keys)) }}
          toolbar={{ extra, total: list.isPlaceholderData ? undefined : list.data?.total }}
        />
      )}
      {list.data && <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={(p) => onSearch({ page: p > 1 ? p : undefined })} />}
      {paying && student && (
        <RecordPaymentDialog
          invoiceId={paying.id}
          student={student}
          onClose={() => setPaying(null)}
          onSaved={() => (setPaying(null), setToast(t.payments.saved))}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
