import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { type SubscriptionKind, useSalesSubscriptions } from '../lib/sales-api';
import { SalesSubscriptionRow } from '../components/SalesSubscriptionRow';

const KINDS = (): { value: SubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

/**
 * «الاشتراكات» of the salesperson (web /sales/subscriptions): my subscriptions in two separate lists,
 * «في الانتظار» and «مؤكدة», never mixed; only the selected kind is fetched. No price, no payment.
 * A confirmed row opens its history. Cached rows stay on screen offline (R-MOB-03).
 */
export function SalesSubscriptionsScreen() {
  const { color } = useTheme();
  const [kind, setKind] = useState<SubscriptionKind>('pending');
  const list = useSalesSubscriptions(kind);
  const empty = kind === 'pending' ? t.sales.subscriptions.emptyPending : t.sales.subscriptions.emptyConfirmed;
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.nav.subscriptions}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FilterPills items={KINDS()} value={kind} onChange={setKind} accessibilityLabel={t.sales.subscriptions.kinds} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.data ?? []}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SalesSubscriptionRow sub={item} withHistory={kind === 'confirmed'} />}
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
