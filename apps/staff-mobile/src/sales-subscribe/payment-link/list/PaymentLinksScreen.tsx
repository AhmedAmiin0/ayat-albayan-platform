import { useState } from 'react';
import { View } from 'react-native';
import { t, EmptyState, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { Note } from '@/more';
import { STRIPE_FEATURE } from '@/sales-subscribe/payment-link/flag';
import { useLinks } from '@/sales-subscribe/payment-link/link-api';
import { useStripeOn } from '@/sales-subscribe/payment-link/use-stripe';
import { PaymentLinkItem } from './PaymentLinkItem';

function LinksList() {
  const links = useLinks();
  const [now] = useState(() => new Date());
  if (links.isError) return <ErrorState onRetry={() => void links.refetch()} />;
  if (!links.data) return <Note>{t.common.loading}</Note>;
  if (links.data.length === 0) return <EmptyState title={t.paymentLinks.empty} />;
  return (
    <View style={{ marginHorizontal: -16 }}>
      {links.data.map((link) => (
        <PaymentLinkItem key={link.id} link={link} now={now} />
      ))}
    </View>
  );
}

function LinksScreen() {
  const on = useStripeOn();
  return (
    <Screen scroll>
      <ScreenHeader title={t.paymentLinks.list} subtitle={t.paymentLinks.testBadge} />
      {on ? <LinksList /> : null}
    </Screen>
  );
}

/** Her payment links, newest first (docs/30); a non-Stripe build renders and fetches nothing. */
export function PaymentLinksScreen() {
  return STRIPE_FEATURE ? <LinksScreen /> : null;
}
