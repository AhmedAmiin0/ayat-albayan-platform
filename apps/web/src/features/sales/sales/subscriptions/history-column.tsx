import type { DataTableColumn } from '@/components/data-table/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { SalesSubscription } from '../api';

const col = createColumnHelper<DataTableFeatures, SalesSubscription>();

/** «السجل» on a confirmed subscription: opens its history (GET /sales/subscriptions/:id/history). */
export function historyColumn(onOpen: (id: string) => void): DataTableColumn<SalesSubscription> {
  return col.display({
    id: 'history',
    header: () => t.sales.history.open,
    cell: (c) => (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label={t.sales.history.openFor.replace('{name}', c.row.original.student.name)}
        onClick={() => onOpen(c.row.original.id)}
      >
        {t.sales.history.open}
      </Button>
    ),
    meta: { className: 'w-px max-sm:order-6', headClassName: 'w-px' },
  });
}
