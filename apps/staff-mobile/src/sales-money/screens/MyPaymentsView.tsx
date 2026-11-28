import type { MyPaymentRow } from '@ab/money';
import { LazyList, t } from '@ab/mobile-kit';
import { LoadState } from '@/sales-money/components/LoadState';
import { useMyPayments } from '@/sales-money/lib/my-api';
import { MyPaymentItem } from '@/sales-money/components/MyPaymentItem';

const renderRow = ({ item }: { item: MyPaymentRow }) => <MyPaymentItem payment={item} />;

/** The API answers only with the caller's own payments. */
export function MyPaymentsView() {
  const list = useMyPayments();
  const P = t.assistantPortal.payments;
  return (
    <LazyList
      accessibilityLabel={P.list}
      data={list.data ?? []}
      keyExtractor={(p) => p.id}
      renderItem={renderRow}
      tabBar={false}
      endSpace={24}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={
        <LoadState status={list} empty emptyTitle={P.empty} emptyHint={P.emptyHint} />
      }
    />
  );
}
