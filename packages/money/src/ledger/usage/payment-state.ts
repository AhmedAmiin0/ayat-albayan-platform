import { fromCents, round2, toCents } from '@ab/core';

// Derived, never stored: a part-paid package keeps subscription_status 'unpaid'; free is full.

export type PaymentState = 'none' | 'partial' | 'full';

export function paymentState(input: { paid: number; price: number }): PaymentState {
  const paid = toCents(input.paid);
  const price = toCents(input.price);
  if (paid >= price) return 'full';
  return paid > 0 ? 'partial' : 'none';
}

/** Signed sum of a package's payments in its own currency: a refund counts against it. */
export function netPaid(rows: readonly { amount: number; kind: 'payment' | 'refund' }[]): number {
  const cents = rows.reduce((n, r) => n + (r.kind === 'refund' ? -1 : 1) * toCents(r.amount), 0);
  return fromCents(cents);
}

/**
 * netPaid over the rows in `currency` only: a legacy row stored in another currency (before
 * payments were converted on entry) is not money toward this package.
 */
export function netPaidIn(
  rows: readonly { amount: number; kind: 'payment' | 'refund'; currency: string }[],
  currency: string,
): number {
  return netPaid(rows.filter((r) => r.currency === currency));
}

/**
 * An amount sent in another currency, in the package currency: `rate` = package units per 1 unit
 * of what was sent (cross rate through SAR: rate(SAR→package) / rate(SAR→sent)), 2 decimals.
 */
export function convertPayment(input: {
  amount: number;
  sarToSent: number;
  sarToPackage: number;
}): {
  amount: number;
  rate: number;
} {
  const rate = input.sarToPackage / input.sarToSent;
  return { amount: round2(input.amount * rate), rate: Math.round(rate * 1e8) / 1e8 };
}

/** Null unless 0 < paid < price; such a package still stays 'unpaid'. */
export function partPaid(input: {
  paid: number;
  price: number;
}): { paid: number; price: number; due: number } | null {
  if (paymentState(input) !== 'partial') return null;
  return {
    paid: input.paid,
    price: input.price,
    due: (toCents(input.price) - toCents(input.paid)) / 100,
  };
}

/** How much a receipt falls short of what is still due: 0 when it covers it or nothing is due. */
export function receiptShortfall(input: { amount: number; due: number }): number {
  return Math.max(0, toCents(input.due) - toCents(input.amount)) / 100;
}
