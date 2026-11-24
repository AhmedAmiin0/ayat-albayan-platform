import { parseAmount } from '@ab/money';
import { Note } from '@/more';
import { shortfallLine } from '@/core/lib/money/format';

interface ShortfallNoteProps {
  /** The amount as typed (parseAmount reads it). */
  amountText: string;
  /** What is still due on the package: price − net paid. */
  due: number;
  currency: string;
}

/** Never blocks the save since a family may pay in parts. */
export function ShortfallNote({ amountText, due, currency }: ShortfallNoteProps) {
  const line = shortfallLine({ amount: parseAmount(amountText), due, currency });
  return line ? <Note>{line}</Note> : null;
}
