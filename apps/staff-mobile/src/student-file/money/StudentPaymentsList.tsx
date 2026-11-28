import type { PaymentView } from '@ab/money';
import { ActivityIndicator } from 'react-native';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState, ErrorState, LazyList, t, useTheme } from '@ab/mobile-kit';
import { PaymentItem } from '@/money/payments/PaymentItem';
import { PaymentTotals } from '@/money/payments/PaymentTotals';
import { periodTotals } from '@/money/shared/queries';

const keyOf = (p: PaymentView) => p.id;
// Keyed by the payment: its receipt viewers hold state that a recycled row must not carry over.
const renderPayment = ({ item }: { item: PaymentView }) => (
  <PaymentItem key={item.id} payment={item} />
);

/** GET /payments?studentId=: payments and refunds, newest first, with the net and receipts. */
export function StudentPaymentsList({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const list = usePagedList<PaymentView>({ path: '/payments', params: { studentId } });
  return (
    <LazyList
      paged={list}
      tabBar={false}
      keyExtractor={keyOf}
      renderItem={renderPayment}
      ListHeaderComponent={<PaymentTotals totals={periodTotals(list.data?.pages[0])} />}
      ListEmptyComponent={
        list.data ? (
          <EmptyState title={t.mobileStudentFile.money.paymentsEmpty} />
        ) : list.isError ? (
          <ErrorState onRetry={list.refresh} message={t.mobileStudentFile.money.error} />
        ) : (
          <ActivityIndicator
            accessibilityLabel={t.common.loading}
            color={color.lapis}
            style={{ paddingVertical: 32 }}
          />
        )
      }
    />
  );
}
