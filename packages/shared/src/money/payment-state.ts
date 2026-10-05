// What a package has been paid, as the lists show it (owner, 2026-10-05). Derived, never stored:
// the stored subscription_status keeps its meaning (a part-paid package is still 'unpaid').
//   none    nothing paid (refunds included)
//   partial «مدفوع جزئيًا»: 0 < paid < price
//   full    paid ≥ price (a free package, price 0, is full)

export type PaymentState = 'none' | 'partial' | 'full';

export function paymentState(input: { paid: number; price: number }): PaymentState {
  const paid = Math.round(input.paid * 100);
  const price = Math.round(input.price * 100);
  if (paid >= price) return 'full';
  return paid > 0 ? 'partial' : 'none';
}

/** Signed sum of a package's payments in its own currency: a refund counts against it. */
export function netPaid(rows: readonly { amount: number; kind: 'payment' | 'refund' }[]): number {
  const cents = rows.reduce((n, r) => n + (r.kind === 'refund' ? -1 : 1) * Math.round(Number(r.amount) * 100), 0);
  return cents / 100;
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
  return { amount: Math.round(input.amount * rate * 100) / 100, rate: Math.round(rate * 1e8) / 1e8 };
}
