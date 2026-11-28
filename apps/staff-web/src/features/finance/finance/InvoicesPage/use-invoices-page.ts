import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/web-kit';
import { invoiceDownload, invoicesQuery, type InvoiceView } from '@/features/finance/finance/api';
import { invoiceColumns } from '@/features/finance/finance/invoice-columns';
import { invoiceRangeFilters } from '@/features/finance/finance/invoice-range-filters';
import { invoicesList } from '@/features/finance/finance/search';
import { clearFilterSearch, toFilterSearch, toSortSearch } from '@/lib/list/list-search';
import type { InvoicesPageProps } from './InvoicesPage.types';
import { filterValuesOf, isBare, pageSearch, paymentOf } from './invoices-page.helpers';

export function useInvoicesPage({ search, onSearch }: InvoicesPageProps) {
  const q = invoicesList(search);
  const list = useQuery(invoicesQuery(q));
  const [paying, setPaying] = useState<InvoiceView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const open = useMutation({
    mutationFn: invoiceDownload,
    onSuccess: (r) => {
      window.open(r.url, '_blank', 'noopener');
    },
  });
  const onAction = (i: InvoiceView, action: string) =>
    action === 'open' ? open.mutate(i.id) : setPaying(i);
  const reset = (patch: Record<string, unknown>) => onSearch({ ...patch, page: undefined });
  const bare = isBare(list.data?.total, search, Object.keys(q.filters).length);
  return {
    list,
    bare,
    toast,
    table: bare ? undefined : list.data,
    columns: invoiceColumns({ onAction }),
    showError: list.isError || open.isError,
    sort: {
      key: q.sort.sort,
      dir: q.sort.dir,
      onChange: (n: Parameters<typeof toSortSearch>[0]) => reset(toSortSearch(n)),
    },
    filters: {
      values: filterValuesOf(search),
      onChange: (key: string, v: string) => reset(toFilterSearch(key, v)),
      onClear: (keys: readonly string[]) => reset(clearFilterSearch(keys)),
    },
    toolbar: {
      extra: invoiceRangeFilters({ search, onChange: reset }),
      total: list.isPlaceholderData ? undefined : list.data?.total,
    },
    payment: paymentOf(paying),
    closePayment: () => setPaying(null),
    paymentSaved: () => {
      setPaying(null);
      setToast(t.payments.saved);
    },
    dismissToast: () => setToast(null),
    toPage: (p: number) => onSearch(pageSearch(p)),
  };
}
