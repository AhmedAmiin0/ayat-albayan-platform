/**
 * Sums per currency, in whole cents (no float drift); never one number across currencies (owner
 * rule). `include` filters rows (the ledger counts earned commissions only).
 */
export function sumByCurrency<T extends { amount: number; currency: string }>(
  rows: readonly T[],
  include: (row: T) => boolean = () => true,
): Record<string, number> {
  const cents: Record<string, number> = {};
  for (const r of rows) if (include(r)) cents[r.currency] = (cents[r.currency] ?? 0) + Math.round(r.amount * 100);
  return Object.fromEntries(Object.entries(cents).map(([c, v]) => [c, v / 100]));
}
