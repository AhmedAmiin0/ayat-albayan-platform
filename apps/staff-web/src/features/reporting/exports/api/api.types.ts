export type ExportKind =
  | 'students'
  | 'lessons'
  | 'payments'
  | 'payouts'
  | 'expenses'
  | 'teacher-ledger'
  | 'receivables';

export interface ExportRequest {
  kind: ExportKind;
  /** `from`/`to` (Riyadh days) for lessons and payments, `month` (YYYY-MM) for payouts. */
  params?: Record<string, string>;
}
