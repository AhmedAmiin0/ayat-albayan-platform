import { asciiDigits } from '@ab/core';
import { moneyAmount } from './schemas.js';

/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western, «٫» and «,» to «.»: an Arabic keypad
 * (phone or desktop) types them. Used by every money input (web and mobile, R-PAY-01).
 */
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
