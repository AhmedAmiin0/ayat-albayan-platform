import type { ExpenseCategory, PaymentMethod } from '@ab/catalog';

// Expenses responses (R-RPT-02, issue E4; owner 2026-10-05, migration 20261005000204).

export interface ExpenseView {
  id: string;
  month: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  note: string | null;
  created_at: string;
  paid_on: string | null;
  vendor: string | null;
  method: PaymentMethod | null;
  has_receipt: boolean;
  recurring: boolean;
  /** A recurring copy pre-created for the month, not counted until confirmed. */
  is_draft: boolean;
}

/** GET /expenses/year: 12 months in the reporting currency (confirmed expenses only). */
export interface ExpenseYearView {
  year: string;
  currency: string;
  months: { month: string; total: number; by_category: Record<string, number> }[];
  categories: string[];
  total: number;
  /** Currencies with no stored rate: their amounts are left out. */
  fx_missing: string[];
  fx_date: string | null;
}

export interface ExpenseCategoryView {
  key: string;
  label_ar: string;
  label_en: string | null;
  active: boolean;
}
