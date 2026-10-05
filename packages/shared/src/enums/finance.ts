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
/**
 * The seeded expense_categories keys (migration 20261005000204), labelled in ar.json; the admin
 * can add more (their label comes from the table), so a category is any key string.
 */
export const EXPENSE_CATEGORIES = [
  'ads',
  'content',
  'tools',
  'operations',
  'rent',
  'salaries',
  'platform_fees',
  'marketing_tools',
  'other',
] as const;
/** A payment, or a refund («استرداد») counted against what was paid (migration 20261005000203). */
export const PAYMENT_KINDS = ['payment', 'refund'] as const satisfies readonly Enums<'payment_kind'>[];
export const ADMIN_TASK_KINDS = [
  'renewal_due',
  'subscription_unpaid',
] as const satisfies readonly Enums<'admin_task_kind'>[];

export type ReportStatus = Enums<'report_status'>;
export type PdfStatus = Enums<'pdf_status'>;
export type PaymentMethod = Enums<'payment_method'>;
export type PayoutStatus = Enums<'payout_status'>;
export type ExpenseCategory = string;
export type PaymentKind = Enums<'payment_kind'>;
export type AdminTaskKind = Enums<'admin_task_kind'>;
