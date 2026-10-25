import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { isOffline } from './payment-errors';
import { PaymentForm } from './PaymentForm';
import { useStudentBalance } from './queries';

const back = () => (router.canGoBack() ? router.back() : router.replace('/students'));

/**
 * /students/payment/:id (R-MOB-02 «record payment with camera»), opened from the student's balance
 * card. Reads the same GET /students/:id/balance the card showed (cached, R-MOB-03), so it opens
 * offline too, but then only says why nothing can be recorded until the network is back.
 */
export function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const balance = useStudentBalance(id);
  const data = balance.data;
  const current = data?.current;
  const offline = balance.isError && isOffline(balance.error);
  const retry = () => void balance.refetch();

  return (
    <Screen>
      <ScreenHeader
        title={current ? t.payments.mobile.recordFor.replace('{student}', current.student.name) : t.payments.record}
        subtitle={current ? ltr(current.student.code) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {data && current ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <PaymentForm studentId={id} balance={data} offline={offline} onRetry={retry} onDone={back} />
        </ScrollView>
      ) : data ? (
        <EmptyState title={t.subscriptions.empty} />
      ) : balance.isError ? (
        <ErrorState onRetry={retry} message={offline ? t.payments.mobile.offline : undefined} />
      ) : null}
    </Screen>
  );
}
