import type { Enums } from '@ab/db';

// Phase 3 enums (migrations 120–121): reports, payments, payouts, expenses, admin tasks.
// Each mirrors a DB enum; `satisfies` breaks the build if one drifts.
export const REPORT_STATUSES = ['draft', 'submitted'] as const satisfies readonly Enums<'report_status'>[];
export const PDF_STATUSES = [
  'pending',
  'rendering',
  'ready',
  'failed',
] as const satisfies readonly Enums<'pdf_status'>[];
export const PAYMENT_METHODS = [
  'bank',
  'wallet',
  'cash',
  'other',
] as const satisfies readonly Enums<'payment_method'>[];
export const PAYOUT_STATUSES = [
  'draft',
  'approved',
  'paid',
] as const satisfies readonly Enums<'payout_status'>[];
/** R-RPT-02 «ads/content spend»; the owner's expenses tracker adds operations. */
export const EXPENSE_CATEGORIES = [
  'ads',
  'content',
  'tools',
  'operations',
  'other',
] as const satisfies readonly Enums<'expense_category'>[];
export const ADMIN_TASK_KINDS = [
  'renewal_due',
  'subscription_unpaid',
] as const satisfies readonly Enums<'admin_task_kind'>[];

export type ReportStatus = Enums<'report_status'>;
export type PdfStatus = Enums<'pdf_status'>;
export type PaymentMethod = Enums<'payment_method'>;
export type PayoutStatus = Enums<'payout_status'>;
export type ExpenseCategory = Enums<'expense_category'>;
export type AdminTaskKind = Enums<'admin_task_kind'>;
