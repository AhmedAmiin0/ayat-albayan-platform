import { useHolds, useIsAdmin, t, SwitchRow } from '@ab/mobile-kit';
import { Note } from '@/more';
import { useIntegrations, useSaveIntegrationValues } from '@/ops/comms/use-line-drivers';
import { STRIPE_FEATURE } from '@/sales-subscribe';
import { stripeSwitch, switchNote, switchValues } from './stripe-switch';

const S = t.paymentLinks.settings;

/**
 * «الدفع الإلكتروني» in «الإعدادات», a Stripe build only (docs/30): the switch of «التكاملات»
 * (STRIPE_ENABLED, off by default) and what it still lacks. Nothing, and no request, in preview /
 * production or for a non-admin; nothing on a server without Stripe (it lists no Stripe key).
 */
export function StripeSwitchRow() {
  const reads = useHolds('settings.read');
  const admin = useIsAdmin();
  const allowed = STRIPE_FEATURE && reads && admin;
  const canWrite = useHolds('settings.write');
  const list = useIntegrations(allowed);
  const save = useSaveIntegrationValues();
  const state = allowed && Array.isArray(list.data) ? stripeSwitch(list.data) : null;
  if (!state) return null;
  return (
    <SwitchRow
      testID="stripe-switch"
      label={S.enabled}
      value={state.on}
      disabled={!canWrite || save.isPending}
      onChange={(on) => save.mutate(switchValues(on))}
    >
      <Note alert={save.isError}>{save.isError ? S.failed : switchNote(state)}</Note>
    </SwitchRow>
  );
}
