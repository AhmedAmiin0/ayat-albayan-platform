import { useHolds, useIsAdmin, t, SwitchRow } from '@ab/mobile-kit';
import { Note } from '@/more';
import { useIntegrations, useSaveIntegrationValues } from '@/ops/comms/use-line-drivers';
import { STRIPE_FEATURE } from '@/sales-subscribe';
import { stripeSwitch, switchNote, switchValues } from './stripe-switch';

const S = t.paymentLinks.settings;

/** docs/30: Stripe build only; no request in preview or production, for non-admins, or w/o keys. */
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
