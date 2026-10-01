import { createColumnHelper } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import type { DataTableFeatures } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import { formatAge, formatDateTime, lastMessageAt } from './format';
import { StatusChip } from './StatusChip';
import type { LeadRow } from './types';

const col = createColumnHelper<DataTableFeatures, LeadRow>();

export interface LeadColumnOptions {
  onReclassify: (row: LeadRow) => void;
  /** Disables the row action while a reclassify request is in flight. */
  busyId: string | null;
}

/** Inbox columns: name, phone, status chip, source, last message, lead age, actions. */
export function leadColumns({ onReclassify, busyId }: LeadColumnOptions) {
  return col.columns([
    col.accessor('name', { header: () => t.leads.name, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('phone_e164', {
      header: () => t.leads.phone,
      cell: (c) => <span dir="ltr">{c.getValue()}</span>,
    }),
    col.accessor('status', {
      header: () => t.leads.status,
      cell: (c) => <StatusChip status={c.getValue()} label={t.enums.leadStatus[c.getValue()]} />,
    }),
    col.accessor('source', {
      header: () => t.leads.source,
      cell: (c) => t.enums.leadSource[c.getValue()],
    }),
    col.accessor((row) => lastMessageAt(row), {
      id: 'lastMessage',
      header: () => t.leads.lastMessage,
      cell: (c) => formatDateTime(c.getValue()),
    }),
    col.accessor('created_at', { header: () => t.leads.age, cell: (c) => formatAge(c.getValue()) }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          disabled={busyId === row.original.id}
          onClick={() => onReclassify(row.original)}
        >
          {t.leads.reclassifyAsApplicant}
        </Button>
      ),
    }),
  ]);
}
