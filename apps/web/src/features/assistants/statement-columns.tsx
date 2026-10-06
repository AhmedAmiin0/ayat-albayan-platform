import { payoutStatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/status-chip';
import { formatDate } from '@/features/leads/format';
import { monthLabel } from '@/features/payouts/MonthSelect';
import { t } from '@/lib/i18n';
import type { AssistantStatementView } from './api';
import { StatementActions, type StatementAction, type StatementCan } from './StatementActions';
import { StatementTotals } from './StatementTotals';

const col = createColumnHelper<DataTableFeatures, AssistantStatementView>();
const S = t.assistants.statements;

type Handlers = { can: StatementCan; onAction: (s: AssistantStatementView, action: StatementAction) => void };

/** Statements of a month: assistant, per-currency totals, status (draft → approved → paid), actions. */
export function statementColumns({ can, onAction }: Handlers) {
  return col.columns([
    col.accessor((s) => s.assistant.name, {
      id: 'assistant',
      header: () => S.assistant,
      cell: (c) => (
        <div className="grid">
          <span className="font-semibold text-ink">{c.getValue()}</span>
          <span className="text-2xs text-ink-3">{monthLabel(c.row.original.month.slice(0, 7))}</span>
        </div>
      ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: { kind: 'text' } },
    }),
    col.accessor((s) => s.totals, {
      id: 'totals',
      header: () => S.total,
      cell: (c) => <StatementTotals totals={c.getValue()} />,
      meta: { className: 'max-sm:order-3 max-sm:basis-full' },
    }),
    col.accessor('status', {
      header: () => t.subscriptions.status,
      cell: (c) => {
        const s = c.row.original;
        const when = s.paid_at ?? s.approved_at;
        return (
          <div className="grid justify-items-start gap-0.5">
            <StatusChip size="sm" {...payoutStatusStyle[s.status]} label={t.enums.payoutStatus[s.status]} />
            {when && <span className="text-2xs text-ink-3">{formatDate(when)}</span>}
          </div>
        );
      },
      meta: { className: 'max-sm:order-2' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => <StatementActions statement={c.row.original} can={can} onAction={(a) => onAction(c.row.original, a)} />,
      meta: { className: 'w-px max-sm:order-4' },
    }),
  ]);
}
