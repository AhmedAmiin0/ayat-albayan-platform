import {
  formatAmount,
  linkAmountProblem,
  parseAmount,
  type PaymentLinkStatus,
  type PaymentLinkView,
  type StatusStyle,
} from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { currencyName } from '@/payments';
import { fill } from '@/sales';

// «رابط دفع» words and checks (docs/30). Pure: the API re-checks every amount.

const pl = t.paymentLinks;

/** «{amount} {currency}» lines: the isolated amount, the currency's name. */
const moneyValues = (amount: number, currency: string) => ({ amount: ltr(formatAmount(amount)), currency: currencyName(currency) });

export const referenceLine = (amount: number, currency: string): string => fill(pl.referencePrice, moneyValues(amount, currency));
export const minLine = (amount: number, currency: string): string => fill(pl.minAmount, moneyValues(amount, currency));
export const agreedLine = (amount: number, currency: string): string => fill(pl.mobile.agreed, moneyValues(amount, currency));

interface Reference {
  /** The calculator price (the quote's afterDiscount). */
  reference: number;
  /** settings max_discount_pct; null = no cap. */
  maxDiscountPct: number | null;
}

type AmountCheck = { ok: true; amount: number } | { ok: false; error: string };

/** The agreed amount: a positive number (≤ 2 decimals, Arabic digits too), not below the admin's minimum. */
export function checkAmount(text: string, ref: Reference): AmountCheck {
  const amount = parseAmount(text);
  if (amount === null) return { ok: false, error: t.salesMoney.error.amount };
  if (linkAmountProblem({ amount, reference: ref.reference, maxDiscountPct: ref.maxDiscountPct })) {
    return { ok: false, error: pl.error.discount_too_large };
  }
  return { ok: true, amount };
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

/** The API's `{ code }` in her words (currency_mismatch names the package's), else `fallback`. */
export function linkErrorText(error: unknown, fallback: string = pl.error.generic): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
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
