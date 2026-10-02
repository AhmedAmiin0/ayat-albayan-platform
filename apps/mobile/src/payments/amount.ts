import { moneyAmount } from '@ab/shared';

/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western, «٫» and «,» to «.»: a phone's Arabic
 * keypad types them on the numeric pad.
 */
export function westernDigits(text: string): string {
  return text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.');
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
