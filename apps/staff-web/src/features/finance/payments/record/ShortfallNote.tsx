import { formatAmount, parseAmount, receiptShortfall } from '@ab/money';
import { t } from '@ab/web-kit';

/** Null when not short; it never blocks the save. */
export function shortfallText(input: {
  amount: number;
  due: number;
  currencyLabel: string;
}): string | null {
  const short = receiptShortfall(input);
  if (short <= 0) return null;
  return t.packagePayment.shortfall
    .replace('{amount}', formatAmount(short))
    .replace('{currency}', input.currencyLabel);
}

interface Props {
  /** The amount field as typed (Arabic digits too). */
  amount: string;
  /** What the package still owes: price − net paid; null = nothing to compare. */
  due: number | null;
  /** The package currency as shown (currencySymbol). */
  currencyLabel: string;
}

/** Before saving: says the package stays unpaid when the amount is short; saving is allowed. */
export function ShortfallNote({ amount, due, currencyLabel }: Props) {
  const typed = parseAmount(amount);
  const text =
    typed === null || due === null ? null : shortfallText({ amount: typed, due, currencyLabel });
  if (!text) return null;
  return (
    <p role="status" className="text-sm font-semibold text-act">
      {text}
    </p>
  );
}
