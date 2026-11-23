import { SUBSCRIPTION_STATUSES, subscriptionStatusStyle, type SubscriptionView } from '@ab/shared';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { t, useTheme, EmptyState, ErrorState, FilterPills, type FilterPill } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useRenewalThreshold } from '@/payments/hooks/queries';
import { LazyList } from '@/core/ui/lists/LazyList';
import { SearchField } from '@/core/ui/form/SearchField';
import type { SubscriptionFilter } from '@ab/client-core';
import { subscriptionParams } from '@/money/payments/filters';
import { SubscriptionItem } from './SubscriptionItem';

const PILLS: FilterPill<SubscriptionFilter | 'all'>[] = [
  { value: 'all', label: t.mobileMoney.filterAll },
  ...SUBSCRIPTION_STATUSES.map((s) => ({
    value: s,
    label: t.enums.subscriptionStatus[s],
    ...subscriptionStatusStyle[s],
  })),
  { value: 'partial', label: t.mobileMoney.filterPartial },
];

const keyOf = (s: SubscriptionView) => s.id;

/** Student-name search runs server side. */
export function SubscriptionsList() {
  const { color } = useTheme();
  const [filter, setFilter] = useState<SubscriptionFilter | 'all'>('all');
  const [search, setSearch] = useState('');
  const threshold = useRenewalThreshold();
  const list = usePagedList<SubscriptionView>({
    path: '/subscriptions',
    params: subscriptionParams(filter, search),
  });
  // Keyed by package because FlashList recycling would carry an open cancel confirm to another row.
  const renderItem = useCallback(
    ({ item }: { item: SubscriptionView }) => (
      <SubscriptionItem key={item.id} sub={item} {...(threshold === undefined ? {} : { threshold })} />
    ),
    [threshold],
  );
  const empty = search ? t.common.notFound : t.mobileMoney.subscriptionsEmpty;
  return (
    <>
      <SearchField compact onSearch={setSearch} label={t.mobileMoney.searchStudent} />
      <FilterPills items={PILLS} value={filter} onChange={setFilter} accessibilityLabel={t.mobileMoney.statusFilter} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={empty} />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </>
  );
}
