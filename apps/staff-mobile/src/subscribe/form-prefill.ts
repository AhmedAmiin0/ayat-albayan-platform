import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DISCOUNT_MAX,
  lessonsOf,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
  type RenewalPricing,
} from '@ab/shared';
import type { PlanChoice } from '@/finance/pricing/selection';
import { INITIAL_FORM, type SubscribeForm } from './subscribe-form';

// The subscribe screen's route params → its first form (R-SUB-01). Route params are untrusted
// strings: each one is validated and an unusable value keeps the default. Pure.

/**
 * After a booking: `pkg` (its lesson count: 8 → starter…) and `minutes`. From «جدّد الاشتراك»
 * (renewalPricing, docs/18): `plan` (a tier id or custom), `count`, `minutes`, `discount`, `country`.
 */
export type FormPrefill = {
  pkg?: string;
  plan?: string;
  count?: string;
  minutes?: string;
  discount?: string;
  country?: string;
};

const PLANS: readonly PlanChoice[] = [...PACKAGE_IDS, 'custom'];

function planOf(p: FormPrefill): PlanChoice | undefined {
  return PLANS.find((id) => id === p.plan) ?? PACKAGE_IDS.find((id) => String(lessonsOf(id)) === p.pkg);
}

/** A whole lesson count within the custom range. */
function countOf(text: string | undefined): number | undefined {
  const n = Number(text);
  return text && Number.isInteger(n) && n >= CUSTOM_COUNT_MIN && n <= CUSTOM_COUNT_MAX ? n : undefined;
}

/** 0–100 (decimals allowed), as the field's text. */
function discountOf(text: string | undefined): string | undefined {
  const n = Number(text);
  return text && Number.isFinite(n) && n >= 0 && n <= DISCOUNT_MAX ? String(n) : undefined;
}

/** The form a route opens with: the defaults, overridden by every valid param. */
export function formFrom(p: FormPrefill): SubscribeForm {
  const plan = planOf(p);
  const count = countOf(p.count);
  const duration = PRICING_DURATIONS.find((d) => String(d) === p.minutes);
  const discount = discountOf(p.discount);
  const country = SITE_COUNTRIES.find((c) => c === p.country);
  return {
    ...INITIAL_FORM,
    ...(plan ? { plan } : {}),
    ...(count === undefined ? {} : { count }),
    ...(duration ? { duration: `${duration}` as const } : {}),
    ...(discount === undefined ? {} : { discount }),
    ...(country ? { country } : {}),
  };
}

/** A renewal's calculator inputs (renewalPricing, e.g. GET /sales/money/family `renewal`) as the form. */
export function renewalForm(p: RenewalPricing): SubscribeForm {
  return { plan: p.pkg, count: p.count, duration: `${p.duration}`, discount: String(p.discount), country: p.country || 'guardian' };
}
