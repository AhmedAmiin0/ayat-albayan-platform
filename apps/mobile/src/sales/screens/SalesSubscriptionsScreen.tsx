import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { type SalesSubscription, type SubscriptionKind, useSalesSubscriptions } from '../lib/sales-api';
import { SalesSubscriptionRow } from '../components/SalesSubscriptionRow';

const KINDS = (): { value: SubscriptionKind; label: string }[] => [
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
  const [kind, setKind] = useState<SubscriptionKind>('pending');
  const list = useSalesSubscriptions(kind);
  const inset = useTabBarInset();
  const confirmed = kind === 'confirmed';
  const row = useCallback(({ item }: ListRenderItemInfo<SalesSubscription>) => <SalesSubscriptionRow sub={item} withHistory={confirmed} />, [confirmed]);
  const cells = useInsetRows(row, list.data?.length ?? 0);
  const empty = kind === 'pending' ? t.sales.subscriptions.emptyPending : t.sales.subscriptions.emptyConfirmed;
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.nav.subscriptions}
        size="h2"
        connecting
        count={list.data?.length}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
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
