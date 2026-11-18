import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import {
  t,
  useTheme,
  BackButton,
  EmptyState,
  ErrorState,
  FilterPills,
  Screen,
  ScreenHeader,
  useTabBarInset,
} from '@ab/mobile-kit';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import type { SalesSubscriptionKind, SalesSubscriptionView } from '@ab/shared';
import { useSalesSubscriptions } from '@/sales/sales/lib/sales-api';
import { SalesSubscriptionRow } from '@/sales/sales/components/SalesSubscriptionRow';

const KINDS = (): { value: SalesSubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

/**
 * «الاشتراكات» of the salesperson (web /sales/subscriptions): my subscriptions in two separate lists,
 * «في الانتظار» and «مؤكدة», never mixed; only the selected kind is fetched. No price, no payment.
 * A confirmed row opens its history. Cached rows stay on screen offline (R-MOB-03). The list screens' one
 * compact top (owner 2026-10-28): the kind's total on the title's line, the pills, the rows in one inset card.
 */
export function SalesSubscriptionsScreen() {
  const { color } = useTheme();
  const [kind, setKind] = useState<SalesSubscriptionKind>('pending');
  const list = useSalesSubscriptions(kind);
  const inset = useTabBarInset();
  const confirmed = kind === 'confirmed';
  const row = useCallback(({ item }: ListRenderItemInfo<SalesSubscriptionView>) => <SalesSubscriptionRow sub={item} withHistory={confirmed} />, [confirmed]);
  const cells = useInsetRows(row, list.data?.length ?? 0);
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
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={list.data ?? []}
        keyExtractor={(s) => s.id}
        {...cells}
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
