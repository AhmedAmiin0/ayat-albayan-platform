import type { Json, Tables } from '@ab/db';
import type { AssistantStatementLineView, AssistantStatementView, CurrencyTotals, StatementLineKind } from '@ab/shared';

type LineRow = {
  kind: string;
  amount: number;
  currency: string;
  commission: { student: { code: string | null; name: string } | null } | null;
  adjustment: { reason: string } | null;
};
export type StatementRow = Tables<'assistant_statements'> & {
  assistant: { id: string; full_name: string } | null;
  lines: LineRow[];
};

/** assistant_statements.lines + the names a statement shows, in one read. */
export const STATEMENT_SELECT =
  '*, assistant:profiles!assistant_id(id, full_name), lines:assistant_statement_lines(kind, amount, currency, commission:assistant_commissions(student:students(code, name)), adjustment:assistant_adjustments(reason))';

const RANK: Record<StatementLineKind, number> = { salary: 0, commission: 1, adjustment: 2 };
const isKind = (k: string): k is StatementLineKind => k === 'salary' || k === 'commission' || k === 'adjustment';
const num = (v: Json | undefined): number => (typeof v === 'number' ? v : 0);

/** The frozen totals ({currency: {salary, commissions, adjustments, total}}); anything else reads empty. */
export function readTotals(v: Json): Record<string, CurrencyTotals> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Record<string, CurrencyTotals> = {};
  for (const [currency, t] of Object.entries(v)) {
    if (typeof t !== 'object' || t === null || Array.isArray(t)) continue;
    out[currency] = { salary: num(t['salary']), commissions: num(t['commissions']), adjustments: num(t['adjustments']), total: num(t['total']) };
  }
  return out;
}

/** A whitelist of columns: the receipt path, the actors' ids and the row's links never leave. */
function toLine(l: LineRow & { kind: StatementLineKind }): AssistantStatementLineView {
  const student = l.commission?.student;
  return {
    kind: l.kind,
    amount: Number(l.amount),
    currency: l.currency,
    student: student ? { code: student.code ?? '', name: student.name } : null,
    reason: l.adjustment?.reason ?? null,
  };
}

export function toStatementView(row: StatementRow): AssistantStatementView {
  const lines = row.lines
    .flatMap((l) => (isKind(l.kind) ? [{ ...l, kind: l.kind }] : []))
    .sort((a, b) => RANK[a.kind] - RANK[b.kind] || (a.commission?.student?.name ?? '').localeCompare(b.commission?.student?.name ?? '', 'ar'))
    .map(toLine);
  return {
    id: row.id,
    assistant: { id: row.assistant_id, name: row.assistant?.full_name ?? '' },
    month: row.month,
    status: row.status,
    totals: readTotals(row.totals),
    lines,
    approved_at: row.approved_at,
    paid_at: row.paid_at,
    method: row.method,
    note: row.note,
    has_receipt: row.receipt_path !== null,
  };
}
