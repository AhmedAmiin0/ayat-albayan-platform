import { stoppedCharge, type ReceivableIn } from '@ab/shared';

/** A package as ReceivablesRepo reads it; `stop` only for a stopped course. */
export interface ReceivablePkg extends ReceivableIn {
  stop: { lessonsTotal: number; attended: number } | null;
}

/**
 * «مستحق على الطلاب» of a STOPPED course (owner 2026-11-05): owed for its attended lessons at the
 * refund rate (stoppedCharge), never its price, so a «إلغاء مع استرداد» is never listed as owing
 * the refund and a plain stop never owes the forfeited lessons. Any other package owes its price.
 */
export function withStoppedCharge(
  pkgs: readonly ReceivablePkg[],
  ratePercent: number,
): ReceivableIn[] {
  return pkgs.map(({ stop, ...pkg }) => {
    if (!stop) return pkg;
    const charge = { ...stop, price: pkg.price, currency: pkg.currency };
    return { ...pkg, owed_for: stoppedCharge(charge, ratePercent) };
  });
}
