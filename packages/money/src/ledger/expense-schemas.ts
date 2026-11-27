import { z } from 'zod';
import { PAYMENT_METHODS } from '@ab/catalog';
import { id, localDate, optionalText, partialOf } from '@ab/core';
import { currencyIso, monthParam, moneyAmount, RECEIPT_MAX_BYTES, RECEIPT_MIMES } from './schemas';

// Expenses (R-RPT-02, issue E4). The category is a key of expense_categories
// (migration 20261005000204): the seeded ones plus any the admin adds.

/** A category key: lower-case latin, digits and _, like `platform_fees`. */
export const expenseCategoryKey = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, 'invalid_category');

const fields = {
  category: expenseCategoryKey,
  amount: moneyAmount,
  /** The day it was paid; the accounting month follows it unless `month` is sent. */
  paidOn: localDate.nullish(),
  vendor: z.string().trim().max(200).nullish(),
  method: z.enum(PAYMENT_METHODS).nullish(),
  /** From POST /expenses/receipt-upload-url (receipts/expenses/…). */
  receiptPath: z.string().min(1).nullish(),
  /** Monthly repeat: next month's draft is pre-created by the job. */
  recurring: z.boolean().optional(),
  note: optionalText,
};

const expenseFieldsSchema = z.object({
  ...fields,
  month: monthParam.optional(),
  currency: currencyIso.default('EGP'),
});

/** POST /expenses. The owner's tracker is in EGP. */
export const expenseCreateSchema = expenseFieldsSchema.refine(
  (e) => e.month !== undefined || (e.paidOn !== undefined && e.paidOn !== null),
  { message: 'month_required', path: ['month'] },
);

/** PATCH /expenses/:id. `isDraft: false` confirms a recurring draft. */
export const expenseUpdateSchema = partialOf(expenseFieldsSchema).extend({
  isDraft: z.literal(false).optional(),
});

/** POST /expense-categories: the admin adds a category. */
export const expenseCategoryCreateSchema = z.object({
  key: expenseCategoryKey,
  labelAr: z.string().trim().min(1).max(60),
  labelEn: z.string().trim().max(60).nullish(),
});

/** One row of GET /expense-categories, and the answer of POST /expense-categories. */
export const expenseCategoryViewSchema = z.object({
  key: z.string(),
  label_ar: z.string(),
  label_en: z.string().nullable(),
  active: z.boolean(),
});

/** POST /expenses/receipt-upload-url. */
export const expenseReceiptUploadSchema = z.object({
  mime: z.enum(RECEIPT_MIMES, { message: 'receipt_type' }),
  size: z.int().min(1).max(RECEIPT_MAX_BYTES, { message: 'receipt_too_large' }),
});

/** GET /expenses/year?year=: the 12-month table. */
export const expenseYearQuery = z.object({ year: z.string().regex(/^\d{4}$/, 'invalid_year') });

/** GET /expenses?month= or ?year=. */
export const expenseListQuery = z.union([z.object({ month: monthParam }), expenseYearQuery]);

/**
 * One expense as the api answers it; `category` is any key of expense_categories. An expense is
 * entered by hand, so its method is never the platform's card.
 */
export const expenseViewSchema = z.object({
  id: id(),
  month: monthParam,
  category: z.string(),
  amount: z.number(),
  currency: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
  paid_on: z.string().nullable(),
  vendor: z.string().nullable(),
  method: z.enum(PAYMENT_METHODS).nullable(),
  has_receipt: z.boolean(),
  recurring: z.boolean(),
  /** A recurring copy pre-created for the month, not counted until confirmed. */
  is_draft: z.boolean(),
});

/** GET /expenses/year: 12 months in the reporting currency (confirmed expenses only). */
export const expenseYearViewSchema = z.object({
  year: z.string(),
  currency: z.string(),
  months: z.array(
    z.object({
      month: z.string(),
      total: z.number(),
      by_category: z.record(z.string(), z.number()),
    }),
  ),
  categories: z.array(z.string()),
  total: z.number(),
  /** Currencies with no stored rate: their amounts are left out. */
  fx_missing: z.array(z.string()),
  fx_date: z.string().nullable(),
});

export type ExpenseCreate = z.output<typeof expenseCreateSchema>;
export type ExpenseCreateInput = z.input<typeof expenseCreateSchema>;
export type ExpenseUpdate = z.output<typeof expenseUpdateSchema>;
export type ExpenseCategoryCreate = z.output<typeof expenseCategoryCreateSchema>;
export type ExpenseCategoryView = z.infer<typeof expenseCategoryViewSchema>;
export type ExpenseView = z.infer<typeof expenseViewSchema>;
export type ExpenseYearView = z.infer<typeof expenseYearViewSchema>;
