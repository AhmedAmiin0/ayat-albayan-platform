import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { useTheme } from '@/theme';
import { useStripeSettings } from './stripe-settings-api';

const STRIPE_SETTINGS_HREF = '/more/ops/settings/stripe';

/** The «الإعدادات» row of the test app's admin; nothing elsewhere (no flag, not an admin, no Stripe server). */
export function StripeSettingsRow() {
  const { color } = useTheme();
  const { settings } = useStripeSettings();
  if (!settings) return null;
  return (
    <ListRow
      title={t.paymentLinks.settings.section}
      trailing={<Chevron to="next" color={color.ink3} />}
      onPress={() => router.push(STRIPE_SETTINGS_HREF)}
    />
  );
}
