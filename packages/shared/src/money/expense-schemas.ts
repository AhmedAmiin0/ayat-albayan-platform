import { z } from 'zod';
import { PAYMENT_METHODS } from '../enums/index.js';
import { optionalText } from '../core/schemas/common.js';
import { localDate } from '../schedule/schemas/scheduling.js';
import { currencyIso, monthParam, moneyAmount, RECEIPT_MAX_BYTES, RECEIPT_MIMES } from './schemas.js';

// Expenses (R-RPT-02, issue E4; owner 2026-10-05). The category is a key of expense_categories
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
  /** «تكرار شهري»: next month's draft is pre-created by the job. */
  recurring: z.boolean().optional(),
  note: optionalText,
};

/** POST /expenses. The owner's tracker is in EGP. */
export const expenseCreateSchema = z
  .object({ ...fields, month: monthParam.optional(), currency: currencyIso.default('EGP') })
  .refine((e) => e.month !== undefined || (e.paidOn !== undefined && e.paidOn !== null), {
    message: 'month_required',
    path: ['month'],
  });

/** PATCH /expenses/:id. `isDraft: false` confirms a recurring draft. */
export const expenseUpdateSchema = z.object({
  month: monthParam.optional(),
  category: expenseCategoryKey.optional(),
  amount: moneyAmount.optional(),
  currency: currencyIso.optional(),
  paidOn: fields.paidOn,
  vendor: fields.vendor,
  method: fields.method,
  receiptPath: fields.receiptPath,
  recurring: z.boolean().optional(),
  isDraft: z.literal(false).optional(),
  note: optionalText,
});

/** POST /expense-categories: the admin adds a category. */
export const expenseCategoryCreateSchema = z.object({
  key: expenseCategoryKey,
  labelAr: z.string().trim().min(1).max(60),
  labelEn: z.string().trim().max(60).nullish(),
});

/** POST /expenses/receipt-upload-url. */
export const expenseReceiptUploadSchema = z.object({
  mime: z.enum(RECEIPT_MIMES, { message: 'receipt_type' }),
  size: z.int().min(1).max(RECEIPT_MAX_BYTES, { message: 'receipt_too_large' }),
});

/** GET /expenses?month= or ?year= (the 12-month view). */
export const expenseListQuery = z.union([
  z.object({ month: monthParam }),
  z.object({ year: z.string().regex(/^\d{4}$/, 'invalid_year') }),
]);

export type ExpenseCreate = z.output<typeof expenseCreateSchema>;
export type ExpenseUpdate = z.output<typeof expenseUpdateSchema>;
export type ExpenseCategoryCreate = z.output<typeof expenseCategoryCreateSchema>;
