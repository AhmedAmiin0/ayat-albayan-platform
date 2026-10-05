import { parseAmount, type PaymentMethod } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { ExpenseBody, ExpenseView } from './api';

// The expense dialog's form ↔ the API body (pure, unit-tested).

export type ExpenseForm = {
  category: string;
  amount: string;
  currency: string;
  paidOn: string;
  vendor: string;
  method: PaymentMethod | '';
  recurring: boolean;
  note: string;
};

export function expenseForm(e: ExpenseView | null, today: string): ExpenseForm {
  return {
    category: e?.category ?? 'ads',
    amount: e ? String(e.amount) : '',
    currency: e?.currency ?? 'EGP',
    paidOn: e?.paid_on ?? today,
    vendor: e?.vendor ?? '',
    method: e?.method ?? '',
    recurring: e?.recurring ?? false,
    note: e?.note ?? '',
  };
}

export type ExpenseCheck = { ok: true; body: ExpenseBody } | { ok: false; errors: { amount?: string } };

/** Field errors instead of a silent no-op: an empty, zero or badly written amount says why. */
export function expenseBody(form: ExpenseForm, month: string): ExpenseCheck {
  const amount = parseAmount(form.amount);
  if (amount === null || amount <= 0)
    return { ok: false, errors: { amount: form.amount.trim() ? t.payments.mobile.amountInvalid : t.common.required } };
  const paidOn = form.paidOn || null;
  return {
    ok: true,
    body: {
      // the paid day decides the month when there is one (an expense of «2026-10-03» is October's)
      month: paidOn ? paidOn.slice(0, 7) : month,
      category: form.category,
      amount,
      currency: form.currency,
      paidOn,
      vendor: form.vendor.trim() || null,
      method: form.method || null,
      recurring: form.recurring,
      note: form.note.trim() || null,
    },
  };
}
