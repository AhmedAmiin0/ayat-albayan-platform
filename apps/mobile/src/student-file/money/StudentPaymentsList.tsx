import type { PaymentView } from '@ab/shared';
import { ActivityIndicator, FlatList } from 'react-native';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { t } from '@/core/lib/i18n/i18n';
import { PaymentItem } from '@/money/payments/PaymentItem';
import { PaymentTotals } from '@/money/payments/PaymentTotals';
import { periodTotals } from '@/money/shared/queries';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';

/** GET /payments?studentId=: the student's payments and refunds, newest first, with the net; each with its receipt. */
export function StudentPaymentsList({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const list = usePagedList<PaymentView>({ path: '/payments', params: { studentId } });
  return (
    <FlatList
      style={{ flex: 1, marginHorizontal: -16 }}
      data={list.items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PaymentItem payment={item} />}
      onEndReached={list.loadMore}
      refreshing={list.isRefetching}
      onRefresh={list.refresh}
      ListHeaderComponent={<PaymentTotals totals={periodTotals(list.data?.pages[0])} />}
      ListEmptyComponent={
        list.data ? (
          <EmptyState title={t.mobileStudentFile.money.paymentsEmpty} />
        ) : list.isError ? (
          <ErrorState onRetry={list.refresh} message={t.mobileStudentFile.money.error} />
        ) : (
          <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
        )
      }
    />
  );
}
