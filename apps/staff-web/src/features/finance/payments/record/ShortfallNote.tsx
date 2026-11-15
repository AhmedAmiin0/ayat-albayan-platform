import { formatAmount, parseAmount, receiptShortfall } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** «المبلغ أقل من المستحق بـ 1 ر.س…» before saving a receipt short of what is due, else null (never blocks). */
export function shortfallText(input: { amount: number; due: number; currencyLabel: string }): string | null {
  const short = receiptShortfall(input);
  if (short <= 0) return null;
  return t.packagePayment.shortfall.replace('{amount}', formatAmount(short)).replace('{currency}', input.currencyLabel);
}

type Props = {
  /** The amount field as typed (Arabic digits too). */
  amount: string;
  /** What the package still owes: price − net paid; null = nothing to compare (a refund, another currency). */
  due: number | null;
  /** The package currency as shown (currencySymbol). */
  currencyLabel: string;
};

/** Before saving a receipt (owner 2026-10-28): says the package stays unpaid when the amount is short; saving stays allowed. */
export function ShortfallNote({ amount, due, currencyLabel }: Props) {
  const typed = parseAmount(amount);
  const text = typed === null || due === null ? null : shortfallText({ amount: typed, due, currencyLabel });
  if (!text) return null;
  return (
    <p role="status" className="text-sm font-semibold text-act">
      {text}
    </p>
  );
}
