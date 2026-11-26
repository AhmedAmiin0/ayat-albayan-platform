import type { MyPaymentRow } from '@ab/money';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@ab/mobile-kit';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { LoadState } from '@/sales-money/components/LoadState';
import { useMyPayments } from '@/sales-money/lib/my-api';
import { MyPaymentItem } from '@/sales-money/components/MyPaymentItem';

const renderRow = ({ item }: ListRenderItemInfo<MyPaymentRow>) => <MyPaymentItem payment={item} />;

/** The API answers only with the caller's own payments. */
export function MyPaymentsView() {
  const list = useMyPayments();
  const P = t.assistantPortal.payments;
  const cells = useInsetRows(renderRow, list.data?.length ?? 0);
  return (
    <FlatList
      accessibilityLabel={P.list}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      data={list.data ?? []}
      keyExtractor={(p) => p.id}
      {...cells}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={
        <LoadState status={list} empty emptyTitle={P.empty} emptyHint={P.emptyHint} />
      }
    />
  );
}
