import { type Href, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useIsAdmin } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
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

interface LinkOutcomeProps {
  token: string;
  /** How Stripe came back: 'done' (wait for the webhook) or 'cancelled'. */
  r: string | undefined;
  /** '' (an admin) or '/sales': the tree of the student's file. */
  base: TreeBase;
}

/**
 * The link as our API has it: «تم الدفع», confirming (the webhook may come after Stripe's redirect; after a
 * minute «لم يصل تأكيد الدفع بعد» and «تحديث»), «لم يتم الدفع» (cancelled), or not hers. Then the student's
 * file, which reaches the family's chat.
 */
function LinkOutcome({ token, r, base }: LinkOutcomeProps) {
  const result = useLinkByToken(token, r === 'done');
  const [now] = useState(() => new Date());
  if (result.isError) return <ErrorState onRetry={() => void result.refetch()} />;
  if (result.data === undefined) return <Note>{t.common.loading}</Note>;
  const link = result.link;
  if (!link) return <EmptyState title={pl.pay.notFound} />;
  const open = link.status === 'open';
  const stuck = r === 'done' && open && result.timedOut;
  return (
    <>
      {link.status === 'paid' ? <Note>{pl.mobile.paid}</Note> : null}
      {r === 'cancelled' && open ? <Note>{pl.pay.cancelTitle}</Note> : null}
      {r === 'done' && open ? <Note>{stuck ? pl.mobile.notConfirmed : pl.mobile.confirming}</Note> : null}
      {stuck ? <Button variant="secondary" label={pl.mobile.refresh} onPress={result.retry} /> : null}
      <View style={{ marginHorizontal: -16 }}>
        <PaymentLinkItem link={link} now={now} readOnly />
      </View>
      <Button
        variant="secondary"
        label={pl.mobile.openStudent}
        onPress={() => router.push(inTree(base, `/inbox/student/${link.student.id}` as Href))}
      />
    </>
  );
}

function DoneScreen() {
  const { token = '', r } = useLocalSearchParams<{ token?: string; r?: string }>();
  const on = useStripeOn();
  const base: TreeBase = useIsAdmin() ? '' : '/sales';
  // Back where she opened the link (the chat, or the link she made); after a cold start, her inbox.
  const back = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  return (
    <Screen scroll>
      <ScreenHeader title={pl.title} subtitle={pl.testBadge} />
      {on ? <LinkOutcome token={token} r={r} base={base} /> : null}
      <Button label={t.common.back} onPress={back} />
    </Screen>
  );
}

/**
 * /pay-done?token=…&r=done|cancelled (docs/30, a Stripe build only): where the pay page sends her
 * back after Stripe when the app opened the link (owner 2026-10-29). The result comes from our API only.
 * Any other build asks nothing and goes to its start (never a blank root screen with no way back).
 */
export function PaymentDoneScreen() {
  return STRIPE_FEATURE ? <DoneScreen /> : <Redirect href="/" />;
}
