import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { LoadState } from './LoadState';
import { useMyPayments } from './my-api';
import { MyPaymentItem } from './MyPaymentItem';

/** «مدفوعاتي» (web MyPayments): the payments I recorded and no others (the API answers only for me). */
export function MyPaymentsView() {
  const list = useMyPayments();
  const P = t.assistantPortal.payments;
  return (
    <FlatList
      accessibilityLabel={P.list}
      style={{ flex: 1, marginHorizontal: -16 }}
      data={list.data ?? []}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <MyPaymentItem payment={item} />}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={P.empty} emptyHint={P.emptyHint} />}
    />
  );
}
