import { t } from '@/core/lib/i18n/i18n';
import { Screen } from '@/core/ui/layout/Screen';
import { Note } from '@/more';
import { SubScreenHeader } from '../../shared/SubScreenHeader';
import { StripeSettingsForm } from './StripeSettingsForm';
import { useStripeSettings } from './stripe-settings-api';

/**
 * «الدفع الإلكتروني (اختبار)» (docs/30): the Stripe test app only. In preview / production (flag false)
 * nothing renders and nothing is asked; for a non-admin, or a server without Stripe (404), only the title.
 */
export function StripeSettingsScreen() {
  const { allowed, settings } = useStripeSettings();
  if (!allowed) return null;
  return (
    <Screen scroll>
      <SubScreenHeader title={t.paymentLinks.settings.section} />
      <Note>{t.paymentLinks.settings.hint}</Note>
      {settings ? <StripeSettingsForm settings={settings} /> : null}
    </Screen>
  );
}
