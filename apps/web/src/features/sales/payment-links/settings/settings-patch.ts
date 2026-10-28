import {
  stripeDraftOf,
  stripeProblemText,
  stripeServerProblems,
  stripeSettingsPatch,
  type StripeDraft,
  type StripeField,
  type StripeProblemKeys,
} from '@ab/client-core';
import type { StripeSettingsPatch } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

// The checks and the PATCH live in @ab/client-core (shared with the Stripe test app); here only the texts.

export type { StripeDraft };

export type StripeProblems = Partial<Record<StripeField, string>>;

export const draftOf = stripeDraftOf;

const texts = (keys: StripeProblemKeys): StripeProblems =>
  Object.fromEntries(Object.entries(keys).map(([field, key]) => [field, stripeProblemText(key, t.paymentLinks)]));

/** PATCH /admin/stripe/settings from the inputs, or the problems under their field (nothing sent). */
export function settingsPatch(d: StripeDraft): { ok: true; patch: StripeSettingsPatch } | { ok: false; problems: StripeProblems } {
  const res = stripeSettingsPatch(d);
  return res.ok ? res : { ok: false, problems: texts(res.problems) };
}

/** The API's refusals under their field; anything else is null (the section's generic line). */
export function serverProblems(e: unknown): StripeProblems | null {
  const keys = stripeServerProblems(e);
  return keys ? texts(keys) : null;
}
