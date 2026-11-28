import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  BackButton,
  EmptyState,
  ErrorState,
  FilterPills,
  Screen,
  ScreenHeader,
  t,
  useTheme,
  LazyList,
} from '@ab/mobile-kit';
import type { SalesSubscriptionKind, SalesSubscriptionView } from '@ab/shared';
import { useSalesSubscriptions } from '@/sales/sales/lib/sales-api';
import { SalesSubscriptionRow } from '@/sales/sales/components/SalesSubscriptionRow';

const KINDS = (): { value: SalesSubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

/** Pending and confirmed are never mixed; only the selected kind is fetched (R-MOB-03). */
export function SalesSubscriptionsScreen() {
  const { color } = useTheme();
  const [kind, setKind] = useState<SalesSubscriptionKind>('pending');
  const list = useSalesSubscriptions(kind);
  const confirmed = kind === 'confirmed';
  const row = useCallback(({ item }: { item: SalesSubscriptionView }) => <SalesSubscriptionRow sub={item} withHistory={confirmed} />, [confirmed]);
  const empty = kind === 'pending' ? t.sales.subscriptions.emptyPending : t.sales.subscriptions.emptyConfirmed;
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.nav.subscriptions}
        size="h2"
        connecting
        count={list.data?.length}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <FilterPills items={KINDS()} value={kind} onChange={setKind} accessibilityLabel={t.sales.subscriptions.kinds} />
      <LazyList
        data={list.data ?? []}
        keyExtractor={(s) => s.id}
        renderItem={row}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={empty} />
          ) : list.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void list.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
