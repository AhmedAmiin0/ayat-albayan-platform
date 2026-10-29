import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useIsAdmin } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { Note } from '@/more';
import { STRIPE_FEATURE } from './flag';
import { useLinkByToken } from './link-api';
import { PaymentLinkItem } from './list/PaymentLinkItem';
import { useStripeOn } from './use-stripe';

const pl = t.paymentLinks;

/** The link as our API has it: confirming (the webhook may come after Stripe's redirect), paid, or not hers. */
function LinkOutcome({ token, wait }: { token: string; wait: boolean }) {
  const result = useLinkByToken(token, wait);
  const [now] = useState(() => new Date());
  if (result.isError) return <ErrorState onRetry={() => void result.refetch()} />;
  if (result.data === undefined) return <Note>{t.common.loading}</Note>;
  const link = result.link;
  if (!link) return <EmptyState title={pl.pay.notFound} />;
  return (
    <>
      {link.status === 'paid' ? <Note>{pl.pay.doneTitle}</Note> : null}
      {wait && link.status === 'open' ? <Note>{pl.mobile.confirming}</Note> : null}
      <View style={{ marginHorizontal: -16 }}>
        <PaymentLinkItem link={link} now={now} readOnly />
      </View>
    </>
  );
}

function DoneScreen() {
  const { token = '', r } = useLocalSearchParams<{ token?: string; r?: string }>();
  const on = useStripeOn();
  const admin = useIsAdmin();
  // Back where she opened the link (the chat, or the link she made); after a cold start, her inbox.
  const back = () => (router.canGoBack() ? router.back() : router.replace(admin ? '/inbox' : '/sales/inbox'));
  return (
    <Screen scroll>
      <ScreenHeader title={pl.title} subtitle={pl.testBadge} />
      {on ? <LinkOutcome token={token} wait={r === 'done'} /> : null}
      <Button label={t.common.back} onPress={back} />
    </Screen>
  );
}

/**
 * /pay-done?token=…&r=done|cancelled (docs/30, the Stripe test build only): where the pay page sends her
 * back after Stripe when the app opened the link (owner 2026-10-29). The result comes from our API only.
 * Any other build renders nothing here and asks nothing (the flag is checked first).
 */
export function PaymentDoneScreen() {
  return STRIPE_FEATURE ? <DoneScreen /> : null;
}
