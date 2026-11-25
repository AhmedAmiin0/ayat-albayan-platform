import type { DataTableColumn } from '@/components/data-table/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Button, t } from '@ab/web-kit';
import type { SalesSubscriptionView } from '@ab/shared';

const col = createColumnHelper<DataTableFeatures, SalesSubscriptionView>();

/** Opens its history (GET /sales/subscriptions/:id/history). */
export function historyColumn(
  onOpen: (id: string) => void,
): DataTableColumn<SalesSubscriptionView> {
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
