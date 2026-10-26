// Light fixtures of the assistant-pay module (test-only; no AppModule, so unit tests stay fast).
import type { StatementRow } from './statements/statements.mapper';

export const A = 'a1000000-0000-4000-8000-00000000000a';
export const B = 'b1000000-0000-4000-8000-00000000000b';
export const ADMIN = 'ad000000-0000-4000-8000-0000000000ad';
export const ID = 'c1000000-0000-4000-8000-000000000001';
export const STUDENT = 'd1000000-0000-4000-8000-000000000001';

/** A statement row as the database returns it (with the receipt path and actors' ids a view must not show). */
export const statementRow = (over: Partial<StatementRow> = {}): StatementRow => ({
  id: ID, assistant_id: A, month: '2026-10-01', status: 'draft',
  totals: { SAR: { salary: 1000, commissions: 100, adjustments: 0, total: 1100 } },
  approved_at: null, approved_by: null, paid_at: null, paid_by: null, method: null, note: null,
  receipt_path: 'receipts/a/secret.pdf', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', created_by: ADMIN,
  assistant: { id: A, full_name: 'الزهراء' },
  lines: [
    { kind: 'commission', amount: 100, currency: 'SAR', commission: { student: { code: 'AB-1001', name: 'ياسمين' } }, adjustment: null },
    { kind: 'salary', amount: 1000, currency: 'SAR', commission: null, adjustment: null },
  ],
  ...over,
});
