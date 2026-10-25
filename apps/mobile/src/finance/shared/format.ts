import { egp } from '@/earnings/lib/format';
import { money } from '@/payments/format';

/** «145 ج.م» / «20 ر.س»: Western digits, isolated; EGP is the academy's own money (docs/11). */
export function amountText(amount: number, currency = 'EGP'): string {
  const rounded = Math.round(amount * 100) / 100;
  return currency === 'EGP' ? egp(rounded) : money(rounded, currency);
}

/** Whole units for KPI cards (the lists keep the exact amount). */
export const wholeText = (amount: number, currency = 'EGP'): string => amountText(Math.round(amount), currency);
