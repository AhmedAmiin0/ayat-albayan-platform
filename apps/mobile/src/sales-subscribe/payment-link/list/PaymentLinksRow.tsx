import { router } from 'expo-router';
import { useHolds } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { STRIPE_FEATURE } from '../flag';
import { useStripeOn } from '../use-stripe';

function Row() {
  const sells = useHolds('self.sales_money');
  const on = useStripeOn();
  if (!sells || !on) return null;
  return <ListRow title={t.paymentLinks.list} onPress={() => router.push('/sales/more/payment-links')} />;
}

/** «روابط الدفع» in her «المزيد» (docs/30): the Stripe test build only, then the server's switch. */
export function PaymentLinksRow() {
  return STRIPE_FEATURE ? <Row /> : null;
}
