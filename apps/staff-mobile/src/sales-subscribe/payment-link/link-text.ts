import {
  customTotal,
  formatAmount,
  type PaymentLinkStatus,
  type PaymentLinkView,
  type StatusStyle,
} from '@ab/shared';
import { z } from 'zod';
import { ApiError, t, ltr, currencyName } from '@ab/mobile-kit';
import { fill } from '@/sales/sales';

// «رابط دفع» words and checks (docs/30). Pure: the API re-checks every amount.

const pl = t.paymentLinks;

/** «{amount} {currency}» lines: the isolated amount, the currency's name. */
const moneyValues = (amount: number, currency: string) => ({ amount: ltr(formatAmount(amount)), currency: currencyName(currency) });

export const referenceLine = (amount: number, currency: string): string => fill(pl.referencePrice, moneyValues(amount, currency));
export const minLine = (amount: number, currency: string): string => fill(pl.minAmount, moneyValues(amount, currency));
export const agreedLine = (amount: number, currency: string): string => fill(pl.mobile.agreed, moneyValues(amount, currency));

interface Floor {
  /** The quote's min_amount (linkFloor: the pills' floor or the admin's cap); null = none. */
  min: number | null;
  currency: string;
}

type AmountCheck = { ok: true; amount: number } | { ok: false; error: string };

/**
 * The agreed amount: a positive number (≤ 2 decimals, Arabic digits too), not below the lowest
 * amount the API takes, said with that amount («أقل مبلغ مسموح به: 153 ر.س»).
 */
export function checkAmount(text: string, floor: Floor): AmountCheck {
  const check = customTotal(text, floor.min);
  if (check.ok) return check;
  const below = check.reason === 'below';
  const error = below ? minLine(check.min, floor.currency) : t.salesMoney.error.amount;
  return { ok: false, error };
}

/** The chat text she sends herself: the localized message with the platform link (never sent for her). */
export function linkMessage(link: PaymentLinkView): string {
  return fill(pl.message, {
    student: link.student.name,
    lessons: String(link.lessons),
    amount: formatAmount(link.amount),
    currency: currencyName(link.currency),
    url: link.url,
  });
}

const errors: Record<string, string | undefined> = pl.error;
/** An amount refused under the floor (discount_not_allowed / discount_too_large with `min`). */
const belowFloor = z.object({ min: z.number(), currency: z.string() });

/**
 * The API's `{ code }` in her words (currency_mismatch names the package's), else `fallback`. An
 * amount under the floor says the lowest amount, not the pills' line (2026-11-16).
 */
export function linkErrorText(error: unknown, fallback: string = pl.error.generic): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const floor = belowFloor.safeParse(body);
  if (floor.success) return minLine(floor.data.min, floor.data.currency);
  if (typeof body !== 'object' || body === null) return fallback;
  const code: unknown = Reflect.get(body, 'code');
  const text = typeof code === 'string' ? errors[code] : undefined;
  if (text === undefined) return fallback;
  const currency: unknown = Reflect.get(body, 'currency');
  return typeof currency === 'string' ? text.replace('{currency}', currency) : text;
}

/** Status grammar (docs/07 §6): paid is settled; open waits on the family; expired / cancelled stopped. */
export const linkStatusStyle: Record<PaymentLinkStatus, StatusStyle> = {
  open: { tone: 'neutral', glyph: 'hollow' },
  paid: { tone: 'ok', glyph: 'fill' },
  expired: { tone: 'neutral', glyph: 'struck' },
  cancelled: { tone: 'neutral', glyph: 'struck' },
};
