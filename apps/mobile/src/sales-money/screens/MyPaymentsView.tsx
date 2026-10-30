import type { MyPaymentRow } from '@ab/shared';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { LoadState } from '../components/LoadState';
import { useMyPayments } from '../lib/my-api';
import { MyPaymentItem } from '../components/MyPaymentItem';

const renderRow = ({ item }: ListRenderItemInfo<MyPaymentRow>) => <MyPaymentItem payment={item} />;

/** «مدفوعاتي» (web MyPayments): the payments I recorded and no others (the API answers only for me). */
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
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={P.empty} emptyHint={P.emptyHint} />}
    />
  );
}
