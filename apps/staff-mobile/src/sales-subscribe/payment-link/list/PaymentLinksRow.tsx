import { router } from 'expo-router';
import { useHolds, t, ListRow } from '@ab/mobile-kit';
import { STRIPE_FEATURE } from '@/sales-subscribe/payment-link/flag';
import { useStripeOn } from '@/sales-subscribe/payment-link/use-stripe';

function Row() {
  const sells = useHolds('self.sales_money');
  const on = useStripeOn();
  if (!sells || !on) return null;
  return <ListRow title={t.paymentLinks.list} onPress={() => router.push('/sales/more/payment-links')} />;
}

/** Payment links row (docs/30): a Stripe build only, then the server's switch. */
export function PaymentLinksRow() {
  return STRIPE_FEATURE ? <Row /> : null;
}
