import { isStripeTestKey, isWebhookSecret, type StripeAdminSettings, type StripeSettingsPatch } from '@ab/shared';
import { ApiError } from '../../core/http/index.js';

// «الدفع الإلكتروني (اختبار)» (docs/30, TEST BUILD ONLY), shared by the web section and the test app's
// admin screen: the inputs, the checks the API makes, the PATCH, and the API's refusals. Each app turns a
// problem key into its own text (paymentLinks.settings.*).

/** The section's inputs. The key and the secret are write-only: empty = keep what is saved. */
export type StripeDraft = { enabled: boolean; apiKey: string; webhookSecret: string; maxDiscount: string };

export type StripeField = 'apiKey' | 'webhookSecret' | 'maxDiscount';
export type StripeProblem = 'liveRefused' | 'invalidSecret' | 'maxDiscountRange';
export type StripeProblemKeys = Partial<Record<StripeField, StripeProblem>>;

export const stripeDraftOf = (s: StripeAdminSettings): StripeDraft => ({
  enabled: s.enabled,
  apiKey: '',
  webhookSecret: '',
  maxDiscount: s.max_discount_pct === null ? '' : String(s.max_discount_pct),
});

const capOf = (text: string): number | null => (text.trim() === '' ? null : Number(text));

/** What the API would refuse: a key that is not a TEST key, a secret that is not whsec_, a cap outside 0–100. */
function problemsOf(d: StripeDraft): StripeProblemKeys {
  const problems: StripeProblemKeys = {};
  const cap = capOf(d.maxDiscount);
  if (d.apiKey.trim() && !isStripeTestKey(d.apiKey)) problems.apiKey = 'liveRefused';
  if (d.webhookSecret.trim() && !isWebhookSecret(d.webhookSecret)) problems.webhookSecret = 'invalidSecret';
  if (cap !== null && !(Number.isFinite(cap) && cap >= 0 && cap <= 100)) problems.maxDiscount = 'maxDiscountRange';
  return problems;
}

/**
 * PATCH /admin/stripe/settings from the inputs, checked as the API does (a live key is refused before it
 * leaves); empty key / secret fields are not sent, an empty cap is null (no cap).
 */
export function stripeSettingsPatch(d: StripeDraft): { ok: true; patch: StripeSettingsPatch } | { ok: false; problems: StripeProblemKeys } {
  const problems = problemsOf(d);
  if (Object.keys(problems).length > 0) return { ok: false, problems };
  const apiKey = d.apiKey.trim();
  const secret = d.webhookSecret.trim();
  return { ok: true, patch: { enabled: d.enabled, maxDiscountPct: capOf(d.maxDiscount), ...(apiKey ? { apiKey } : {}), ...(secret ? { webhookSecret: secret } : {}) } };
}

/** The API's refusals under their field; anything else is null (the section's generic line). */
export function stripeServerProblems(e: unknown): StripeProblemKeys | null {
  const code = e instanceof ApiError && typeof e.body === 'object' && e.body !== null ? (e.body as { code?: unknown }).code : undefined;
  if (code === 'stripe_live_key_refused') return { apiKey: 'liveRefused' };
  if (code === 'invalid_secret') return { webhookSecret: 'invalidSecret' };
  return null;
}

/** The texts a problem key needs (an app's `t.paymentLinks`, ar or en). */
export interface StripeProblemTexts {
  settings: { liveRefused: string; invalidSecret: string };
  web: { maxDiscountRange: string };
}

/** A problem key → its line under the field, from the app's own texts. */
export function stripeProblemText(key: StripeProblem, texts: StripeProblemTexts): string {
  if (key === 'liveRefused') return texts.settings.liveRefused;
  return key === 'invalidSecret' ? texts.settings.invalidSecret : texts.web.maxDiscountRange;
}
