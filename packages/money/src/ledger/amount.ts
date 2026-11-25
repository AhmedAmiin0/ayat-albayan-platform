import { asciiDigits } from '@ab/core';
import { moneyAmount } from './schemas';

/** Arabic-Indic and Persian digits to Western for every money input (R-PAY-01). */
export function westernDigits(text: string): string {
  return asciiDigits(text.trim()).replace(/[٫,]/g, '.');
}

/**
 * The typed amount, or null unless it is a positive number with at most 2 decimals. More decimals
 * are refused, not rounded: «1,500» read as 1.5 would record the wrong money.
 */
export function parseAmount(text: string): number | null {
  const western = westernDigits(text);
  if (!/^\d+(\.\d{1,2})?$/.test(western)) return null;
  const parsed = moneyAmount.safeParse(Number(western));
  return parsed.success ? parsed.data : null;
}

/** parseAmount with 0 accepted, since the stop sheet's custom amount runs from 0. */
export const parseAmountFromZero = (text: string): number | null =>
  /^0+(\.0{1,2})?$/.test(westernDigits(text)) ? 0 : parseAmount(text);
