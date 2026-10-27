import { formatAmount } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { formatDate } from '@/features/sales/leads/format';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import type { AssistantCommissionView } from '../api';
import { commissionStatusStyle } from '../status';

const col = createColumnHelper<DataTableFeatures, AssistantCommissionView>();
const L = t.assistants.ledger;

type Handlers = { canWrite: boolean; onVoid: (c: AssistantCommissionView) => void };

/** «أول اشتراك» (the full commission) or «تجديد (n%)» (its share, owner 2026-10-26). */
const kindText = (c: AssistantCommissionView): string => (c.kind === 'renewal' ? L.kind.renewal.replace('{n}', String(c.share_percent)) : L.kind.first);

/** Commission ledger: who earned what on which student's subscription (first or renewal); void with a reason. */
export function commissionColumns({ canWrite, onVoid }: Handlers) {
  return col.columns([
    col.accessor((c) => c.student.name, {
      id: 'student',
      header: () => L.student,
      cell: (c) => {
        const { student } = c.row.original;
        return (
          <div className="grid">
            <Link to="/admin/students/$studentId" params={{ studentId: student.id }} className="font-semibold text-ink hover:underline">
              {student.name}
            </Link>
            <Ltr className="text-2xs text-ink-3">{student.code}</Ltr>
          </div>
        );
      },
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: { kind: 'text' } },
    }),
    col.accessor(kindText, { id: 'kind', header: () => L.kindLabel, cell: (c) => c.getValue(), meta: { className: 'max-sm:order-3' } }),
    col.accessor((c) => c.assistant.name, { id: 'assistant', header: () => L.assistant, cell: (c) => c.getValue(), meta: { className: 'max-sm:order-3' } }),
    col.accessor('base_amount', {
      header: () => L.base,
      cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.base_currency} />,
      meta: { className: 'max-sm:order-4' },
    }),
    col.accessor('rate', {
      header: () => L.rate,
      cell: (c) => (c.row.original.type === 'percent' ? <Ltr>{L.ratePercent.replace('{value}', formatAmount(c.getValue()))}</Ltr> : L.rateFixed),
      meta: { className: 'max-sm:order-5' },
    }),
    col.accessor('amount', {
      header: () => L.amount,
      cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className="font-semibold" />,
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor('earned_at', {
      header: () => L.earnedAt,
      cell: (c) => formatDate(c.getValue()),
      meta: { className: 'max-sm:order-6' },
    }),
    col.accessor('status', {
      header: () => L.statusLabel,
      cell: (c) => (
        <div className="grid justify-items-start gap-0.5">
          <StatusChip size="sm" {...commissionStatusStyle[c.getValue()]} label={L.status[c.getValue()]} />
          {c.row.original.void_reason && <span className="text-2xs text-ink-3">{L.voidedWhy.replace('{reason}', c.row.original.void_reason)}</span>}
        </div>
      ),
      meta: { className: 'max-sm:order-7' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) =>
        canWrite && c.row.original.status === 'earned' ? (
          <Button type="button" variant="danger-quiet" size="sm" onClick={() => onVoid(c.row.original)}>
            {L.void}
          </Button>
        ) : null,
      meta: { className: 'w-px max-sm:order-8' },
    }),
  ]);
}
