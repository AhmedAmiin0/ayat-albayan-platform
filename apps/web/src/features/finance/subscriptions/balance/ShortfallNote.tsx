import { parseAmount } from '@ab/shared';
import { shortfallText } from '../payment-lines';

type Props = {
  /** The amount field as typed (Arabic digits too). */
  amount: string;
  /** What the package still owes: price − net paid; null = nothing to compare (a refund, another currency). */
  due: number | null;
  /** The package currency. */
  currency: string;
};

/** Before saving a receipt (owner 2026-10-28): says the package stays unpaid when the amount is short; saving stays allowed. */
export function ShortfallNote({ amount, due, currency }: Props) {
  const typed = parseAmount(amount);
  const text = typed === null || due === null ? null : shortfallText({ amount: typed, due, currency });
  if (!text) return null;
  return (
    <p role="status" className="text-sm font-semibold text-act">
      {text}
    </p>
  );
}
