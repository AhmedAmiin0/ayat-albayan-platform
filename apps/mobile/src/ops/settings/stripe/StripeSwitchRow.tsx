import { Switch, View } from 'react-native';
import { useHolds, useIsAdmin } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Note } from '@/more';
import { useIntegrations, useSaveIntegrationValues } from '@/ops/comms/use-line-drivers';
import { STRIPE_FEATURE } from '@/sales-subscribe';
import { type, useTheme } from '@/theme';
import { stripeSwitch, switchNote, switchValues } from './stripe-switch';

const S = t.paymentLinks.settings;

/**
 * «الدفع الإلكتروني» in «الإعدادات», a Stripe build only (docs/30): the switch of «التكاملات»
 * (STRIPE_ENABLED, off by default) and what it still lacks. Nothing, and no request, in preview /
 * production or for a non-admin; nothing on a server without Stripe (it lists no Stripe key).
 */
export function StripeSwitchRow() {
  const color = useTheme().color.ink;
  const reads = useHolds('settings.read');
  const admin = useIsAdmin();
  const allowed = STRIPE_FEATURE && reads && admin;
  const canWrite = useHolds('settings.write');
  const list = useIntegrations(allowed);
  const save = useSaveIntegrationValues();
  const state = allowed && Array.isArray(list.data) ? stripeSwitch(list.data) : null;
  if (!state) return null;
  return (
    <View testID="stripe-switch" style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color }}>
          {S.enabled}
        </AppText>
        <Switch
          accessibilityLabel={S.enabled}
          value={state.on}
          disabled={!canWrite || save.isPending}
          onValueChange={(on) => save.mutate(switchValues(on))}
        />
      </View>
      <Note alert={save.isError}>{save.isError ? S.failed : switchNote(state)}</Note>
    </View>
  );
}
