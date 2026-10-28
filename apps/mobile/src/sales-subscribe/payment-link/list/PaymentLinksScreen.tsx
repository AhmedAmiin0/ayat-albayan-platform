import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Note } from '@/more';
import { STRIPE_FEATURE } from '../flag';
import { useLinks } from '../link-api';
import { useStripeOn } from '../use-stripe';
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

/**
 * /sales/more/payment-links (docs/30, the Stripe test build only): her links, newest first, with
 * «إلغاء الرابط» on an open one. Any other build renders nothing here and asks nothing.
 */
export function PaymentLinksScreen() {
  return STRIPE_FEATURE ? <LinksScreen /> : null;
}
