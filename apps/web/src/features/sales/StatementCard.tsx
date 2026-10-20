import { payoutStatusStyle, type AssistantStatementLineView, type AssistantStatementView } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { formatDate } from '@/features/leads/format';
import { monthLabel } from '@/features/payouts/MonthSelect';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { CurrencyTotalsList } from './CurrencyTotalsList';

const p = t.assistantPortal.earnings;

function lineText(l: AssistantStatementLineView): string {
  if (l.kind === 'salary') return p.line.salary;
  if (l.kind === 'commission') return p.line.commission.replace('{student}', l.student?.name ?? '');
  return p.line.adjustment.replace('{reason}', l.reason ?? '');
}

/** One month's statement: status, the totals per currency, and its lines (salary, commissions, adjustments). */
export function StatementCard({ statement: s }: { statement: AssistantStatementView }) {
  const when = s.paid_at
    ? p.paidAt.replace('{date}', formatDate(s.paid_at))
    : s.approved_at
      ? p.approvedAt.replace('{date}', formatDate(s.approved_at))
      : null;
  return (
    <li className="grid gap-3 border-b border-rule py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-semibold">{monthLabel(s.month.slice(0, 7))}</h3>
        <StatusChip size="sm" {...payoutStatusStyle[s.status]} label={t.enums.payoutStatus[s.status]} />
        {when && <span className="text-2xs text-ink-3">{when}</span>}
      </div>
      <CurrencyTotalsList totals={s.totals} label={monthLabel(s.month.slice(0, 7))} />
      {s.lines.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 text-ink-2">{p.lines}</summary>
          {/* The full-width frame (owner 2026-10-20): each amount stays near its label. */}
          <ul className="grid max-w-[60ch] gap-1.5">
            {s.lines.map((l, i) => (
              <li key={`${l.kind}-${i}`} className="flex flex-wrap justify-between gap-x-4">
                <span>{lineText(l)}</span>
                <Amount amount={l.amount} currency={l.currency} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
