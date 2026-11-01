import { integrationBool, type IntegrationConfigItem, type IntegrationSecretKey } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { fill } from '@/sales';

// «الدفع الإلكتروني» in a Stripe build (docs/30): the same switch as the web's «التكاملات»
// (STRIPE_ENABLED), saved through the same audited PUT /settings/integrations.

const KEYS: readonly IntegrationSecretKey[] = ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'];

interface StripeSwitch {
  on: boolean;
  /** The keys still unset: until both are saved the links stay hidden (GET /stripe/feature). */
  missing: IntegrationSecretKey[];
}

/** The switch and what it lacks; null = this server lists no Stripe key (no FEATURE_STRIPE). */
export function stripeSwitch(items: readonly IntegrationConfigItem[]): StripeSwitch | null {
  const item = items.find((i) => i.key === 'STRIPE_ENABLED');
  if (!item) return null;
  const set = new Set(items.filter((i) => i.set).map((i) => i.key));
  return { on: integrationBool(item.value), missing: KEYS.filter((k) => !set.has(k)) };
}

/** The line under the switch: what off means, working, or the keys it lacks (labels only). */
export function switchNote(s: StripeSwitch): string {
  const S = t.paymentLinks.settings;
  if (!s.on) return S.hint;
  const keys = s.missing.map((k) => t.integrations.keys[k].label).join('، ');
  return keys === '' ? S.ready : fill(S.missing, { keys });
}

/** PUT /settings/integrations body: the switch alone. */
export const switchValues = (on: boolean) => ({ values: { STRIPE_ENABLED: String(on) } });
