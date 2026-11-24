// Phase 3 enums (migrations 120–121): reports, payments, payouts, expenses, admin tasks.
// Each mirrors a DB enum; the api's enum-parity tests catch drift.
export const REPORT_STATUSES = ['draft', 'submitted'] as const;
export const PDF_STATUSES = [
  'pending',
  'rendering',
  'ready',
  'failed',
] as const;
export const PAYMENT_METHODS = [
  'bank',
  'wallet',
  'cash',
  'other',
] as const;
/**
 * A method only the platform records (migration 20261028000941): 'card' = a Stripe Checkout payment
 * (docs/30, with FEATURE_STRIPE test or live). Never offered in a form, so PAYMENT_METHODS stays the manual ones.
 */
export const ONLINE_PAYMENT_METHODS = ['card'] as const;
export const ALL_PAYMENT_METHODS = [...PAYMENT_METHODS, ...ONLINE_PAYMENT_METHODS] as const;
export const PAYOUT_STATUSES = [
  'draft',
  'approved',
  'paid',
] as const;
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
/** A refund counts against what was paid (migration 20261005000203). */
export const PAYMENT_KINDS = ['payment', 'refund'] as const;
export const ADMIN_TASK_KINDS = [
  'renewal_due',
  'subscription_unpaid',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type PdfStatus = (typeof PDF_STATUSES)[number];
export type PaymentMethod = (typeof ALL_PAYMENT_METHODS)[number];
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
export type ExpenseCategory = string;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type AdminTaskKind = (typeof ADMIN_TASK_KINDS)[number];
