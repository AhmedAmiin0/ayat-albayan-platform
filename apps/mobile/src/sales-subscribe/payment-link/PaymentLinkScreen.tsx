import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { ownStudents, useSalesFamily } from '../lib/family';
import { STRIPE_FEATURE } from './flag';
import { PaymentLinkForm } from './PaymentLinkForm';
import { useStripeOn } from './use-stripe';

/** Her students of the chat's family (asked only once Stripe is on), then the form. */
function FamilyForm({ phone, onSent }: { phone: string; onSent: () => void }) {
  const family = useSalesFamily(phone);
  if (family.isError) return <ErrorState onRetry={() => void family.refetch()} />;
  if (!family.data) return null;
  const students = ownStudents(family.data.students);
  if (students.length === 0) return <EmptyState title={t.salesMoney.noOwnStudents} />;
  return <PaymentLinkForm phone={phone} students={students} onSent={onSent} />;
}

function LinkScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone?: string }>();
  const on = useStripeOn();
  const base = useTreeBase();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(inTree(base, '/inbox'));
  };
  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 20 }}
      >
        <ScreenHeader
          title={t.paymentLinks.title}
          subtitle={t.paymentLinks.testBadge}
          trailing={<Button variant="ghost" label={t.common.back} onPress={close} />}
        />
        {on ? <FamilyForm phone={phone} onSent={close} /> : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * /inbox/payment-link?phone=… (docs/30, the Stripe test build only): «رابط دفع» for one of her students of
 * this chat's family. Any other build renders nothing here and asks nothing (the flag is checked first).
 */
export function PaymentLinkScreen() {
  return STRIPE_FEATURE ? <LinkScreen /> : null;
}
