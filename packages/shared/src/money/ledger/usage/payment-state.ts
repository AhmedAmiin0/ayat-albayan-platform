import { fromCents, round2, toCents } from '../cents.js';

// What a package has been paid, as the lists show it (owner, 2026-10-05). Derived, never stored:
// the stored subscription_status keeps its meaning (a part-paid package is still 'unpaid').
//   none    nothing paid (refunds included)
//   partial «مدفوع جزئيًا»: 0 < paid < price
//   full    paid ≥ price (a free package, price 0, is full)

export type PaymentState = 'none' | 'partial' | 'full';

export function paymentState(input: { paid: number; price: number }): PaymentState {
  const paid = toCents(input.paid);
  const price = toCents(input.price);
  if (paid >= price) return 'full';
  return paid > 0 ? 'partial' : 'none';
}

/** Signed sum of a package's payments in its own currency: a refund counts against it. */
export function netPaid(rows: readonly { amount: number; kind: 'payment' | 'refund' }[]): number {
  const cents = rows.reduce((n, r) => n + (r.kind === 'refund' ? -1 : 1) * toCents(Number(r.amount)), 0);
  return fromCents(cents);
}

/**
 * An amount sent in another currency, in the package currency: `rate` = package units per 1 unit
 * of what was sent (cross rate through SAR: rate(SAR→package) / rate(SAR→sent)), 2 decimals.
 */
export function convertPayment(input: { amount: number; sarToSent: number; sarToPackage: number }): {
  amount: number;
  rate: number;
} {
  const rate = input.sarToPackage / input.sarToSent;
  return { amount: round2(input.amount * rate), rate: Math.round(rate * 1e8) / 1e8 };
}

/**
 * «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» (owner 2026-10-28): what was paid, the price and what is left,
 * or null unless 0 < paid < price. The rule itself never changes: such a package stays 'unpaid'.
 */
export function partPaid(input: { paid: number; price: number }): { paid: number; price: number; due: number } | null {
  if (paymentState(input) !== 'partial') return null;
  return { paid: input.paid, price: input.price, due: (toCents(input.price) - toCents(input.paid)) / 100 };
}

/** How much a receipt falls short of what is still due (owner 2026-10-28): 0 when it covers it or nothing is due. */
export function receiptShortfall(input: { amount: number; due: number }): number {
  return Math.max(0, toCents(input.due) - toCents(input.amount)) / 100;
}
