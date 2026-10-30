import { useQuery } from '@tanstack/react-query';
import { Section } from '@/components/settings/Section';
import { t } from '@/lib/i18n/i18n';
import { stripeSettingsQuery } from '../api';
import { stripeBuild } from '../stripe-build';
import { StripeSettingsForm } from './StripeSettingsForm';

const S = t.paymentLinks.settings;

/**
 * «الدفع الإلكتروني (اختبار)» on «التكاملات» (docs/30, TEST BUILD ONLY): nothing, and no request, outside
 * the test build; nothing while GET /admin/stripe/settings is not a 200 (a 404: the server has no Stripe).
 * Shown even while the links are switched off, so the admin can turn them on.
 */
export function StripeSettingsSection({ onSaved }: { onSaved: (message: string) => void }) {
  const build = stripeBuild();
  const settings = useQuery({ ...stripeSettingsQuery, enabled: build });
  if (!build || !settings.data) return null;
  return (
    <Section id="stripe" title={S.section}>
      <p className="text-xs text-ink-2">{S.hint}</p>
      <StripeSettingsForm settings={settings.data} onSaved={onSaved} />
    </Section>
  );
}
