import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { STRIPE_FEATURE } from './flag';
import { useStripeOn } from './use-stripe';

function Pill({ phone }: { phone: string }) {
  const on = useStripeOn();
  const base = useTreeBase();
  if (!on) return null;
  return (
    <PillButton
      label={t.paymentLinks.action}
      onPress={() => router.push(inTree(base, { pathname: '/inbox/payment-link', params: { phone } }))}
    />
  );
}

/**
 * «رابط دفع» in her family chat's money pills (docs/30): the test build's flag FIRST (in any other build this
 * is null and asks nothing), then the server's switch.
 */
export function PaymentLinkPill({ phone }: { phone: string }) {
  return STRIPE_FEATURE ? <Pill phone={phone} /> : null;
}
