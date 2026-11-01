import { parseAmount } from '@ab/shared';
import { Note } from '@/more';
import { shortfallLine } from '@/core/lib/money/format';

interface ShortfallNoteProps {
  /** The amount as typed (parseAmount reads it). */
  amountText: string;
  /** What is still due on the package: price − net paid. */
  due: number;
  currency: string;
}

/**
 * Before saving (owner 2026-10-28): a receipt below what is due leaves the package «غير مدفوعة», so it
 * says so. Never blocks the save: a family may pay in parts.
 */
export function ShortfallNote({ amountText, due, currency }: ShortfallNoteProps) {
  const line = shortfallLine({ amount: parseAmount(amountText), due, currency });
  return line ? <Note>{line}</Note> : null;
}
