import {
  CUSTOM_COUNT_DEFAULT,
  DEFAULT_DURATION,
  parseDiscount,
  PRICING_DURATIONS,
  type PricingDuration,
  type SiteCountry,
  type SubscriptionPricing,
} from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { isOffline } from '@/payments/lib/payment-errors';
import type { PlanChoice } from '@/pricing/selection';
import { dayLabel } from '@/booking/shared/slots';
import { localDate } from '@/today/timeline';

// «اشتراك جديد» from a chat (R-SUB-01): the calculator inputs for ONE student and the package's
// first day. Pure. The price is never computed here: POST /subscriptions(/quote) prices it.

export interface SubscribeForm {
  /** 'guardian' = left out, so the API prices in the guardian's country (USD outside the five). */
  country: SiteCountry | 'guardian';
  /** A pill value (FilterPills are strings); ignored for «باقة الحلقة الأسبوعية». */
  duration: `${PricingDuration}`;
  plan: PlanChoice;
  /** Lessons for 'custom' only. */
  count: number;
  /** A pill's value or what was typed («12.5», «١٢٫٥»); parsed when sent. */
  discount: string;
}

export const INITIAL_FORM: SubscribeForm = {
  country: 'guardian',
  duration: `${DEFAULT_DURATION}`,
  plan: 'standard',
  count: CUSTOM_COUNT_DEFAULT,
  discount: '0',
};

/** The `pricing` of POST /subscriptions(/quote): `tier` xor `count`; no `country` = the guardian's. */
export function pricingOf(f: SubscribeForm): SubscriptionPricing {
  const common = {
    duration: PRICING_DURATIONS.find((d) => `${d}` === f.duration) ?? DEFAULT_DURATION,
    discount: parseDiscount(f.discount),
    ...(f.country === 'guardian' ? {} : { country: f.country }),
  };
  return f.plan === 'custom' ? { ...common, count: f.count } : { ...common, tier: f.plan };
}

const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * The package's first day, picked never typed (rule 6): today and the next 6 days in the family's
 * zone; `first` (the booked first lesson's day) leads when it falls outside them.
 */
export function startDays(now: Date, tz: string, first?: string): string[] {
  const today = localDate(now, tz);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return first && !days.includes(first) ? [first, ...days] : days;
}

/** «النهارده», else «الأحد 4 أكتوبر» (Western digits) for a local date. */
export function startDayLabel(date: string, today: string): string {
  return date === today ? t.mobile.today : dayLabel(new Date(`${date}T12:00:00Z`));
}

function codeOf(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const body = error.body;
  if (typeof body !== 'object' || body === null || !('code' in body)) return undefined;
  return typeof body.code === 'string' ? body.code : undefined;
}

const messages: Record<string, string | undefined> = t.subscriptions.error;

/**
 * What the screen says when the quote or the save failed. A save that got no answer is honest
 * about not knowing whether it was stored (the retry checks first, use-subscribe).
 */
export function subscribeErrorText(error: unknown, when: 'quote' | 'save'): string {
  if (when === 'save' && isOffline(error)) return t.subscriptions.mobile.offline;
  const code = codeOf(error);
  return (code === undefined ? undefined : messages[code]) ?? t.common.error;
}
