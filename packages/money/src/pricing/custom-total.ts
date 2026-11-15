import { parseAmount } from '../ledger/amount.js';

/** A typed «مبلغ مخصص»: the amount, or why not (not an amount, or under `min`). */
export type CustomTotal =
  | { ok: true; amount: number }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'below'; min: number };

/**
 * The quote's typed total, read with parseAmount (Arabic digits too). `min` is the sales floor
 * (salesPriceFloor), null for the admin (unrestricted). Pure: web and mobile share it.
 */
export function customTotal(text: string, min: number | null): CustomTotal {
  const amount = parseAmount(text);
  if (amount === null) return { ok: false, reason: 'invalid' };
  return min !== null && amount < min ? { ok: false, reason: 'below', min } : { ok: true, amount };
}
