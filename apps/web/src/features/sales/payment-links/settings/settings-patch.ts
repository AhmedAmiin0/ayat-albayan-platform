import { isStripeTestKey, isWebhookSecret, type StripeAdminSettings, type StripeSettingsPatch } from '@ab/shared';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

const S = t.paymentLinks.settings;

/** The section's inputs. The key and the secret are write-only: empty = keep what is saved. */
export type StripeDraft = { enabled: boolean; apiKey: string; webhookSecret: string; maxDiscount: string };

export type StripeProblems = Partial<Record<'apiKey' | 'webhookSecret' | 'maxDiscount', string>>;

export const draftOf = (s: StripeAdminSettings): StripeDraft => ({
  enabled: s.enabled,
  apiKey: '',
  webhookSecret: '',
  maxDiscount: s.max_discount_pct === null ? '' : String(s.max_discount_pct),
});

const capOf = (text: string): number | null => (text.trim() === '' ? null : Number(text));

/** What the API would refuse: a key that is not a TEST key, a secret that is not whsec_, a cap outside 0–100. */
function problemsOf(d: StripeDraft): StripeProblems {
  const problems: StripeProblems = {};
  const cap = capOf(d.maxDiscount);
  if (d.apiKey.trim() && !isStripeTestKey(d.apiKey)) problems.apiKey = S.liveRefused;
  if (d.webhookSecret.trim() && !isWebhookSecret(d.webhookSecret)) problems.webhookSecret = S.invalidSecret;
  if (cap !== null && !(Number.isFinite(cap) && cap >= 0 && cap <= 100)) problems.maxDiscount = t.paymentLinks.web.maxDiscountRange;
  return problems;
}

/**
 * PATCH /admin/stripe/settings from the inputs, checked as the API does (a live key is refused before it
 * leaves); empty key / secret fields are not sent, an empty cap is null (no cap).
 */
export function settingsPatch(d: StripeDraft): { ok: true; patch: StripeSettingsPatch } | { ok: false; problems: StripeProblems } {
  const problems = problemsOf(d);
  if (Object.keys(problems).length > 0) return { ok: false, problems };
  const apiKey = d.apiKey.trim();
  const secret = d.webhookSecret.trim();
  return { ok: true, patch: { enabled: d.enabled, maxDiscountPct: capOf(d.maxDiscount), ...(apiKey ? { apiKey } : {}), ...(secret ? { webhookSecret: secret } : {}) } };
}

/** The API's refusals under their field; anything else is null (the section's generic line). */
export function serverProblems(e: unknown): StripeProblems | null {
  const code = e instanceof ApiError && typeof e.body === 'object' && e.body !== null ? (e.body as { code?: unknown }).code : undefined;
  if (code === 'stripe_live_key_refused') return { apiKey: S.liveRefused };
  if (code === 'invalid_secret') return { webhookSecret: S.invalidSecret };
  return null;
}
