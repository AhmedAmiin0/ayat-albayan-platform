import { SUBSCRIPTION_STATUSES, subscriptionStatusStyle, type SubscriptionView } from '@ab/shared';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useRenewalThreshold } from '@/payments/hooks/queries';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { SearchField } from '@/core/ui/form/SearchField';
import { subscriptionParams, type SubscriptionFilter } from '../payments/filters';
import { SubscriptionItem } from './SubscriptionItem';

const PILLS: FilterPill<SubscriptionFilter>[] = [
  { value: 'all', label: t.mobileMoney.filterAll },
  ...SUBSCRIPTION_STATUSES.map((s) => ({
    value: s,
    label: t.enums.subscriptionStatus[s],
    ...subscriptionStatusStyle[s],
  })),
  { value: 'partial', label: t.mobileMoney.filterPartial },
];

const keyOf = (s: SubscriptionView) => s.id;

/** «الباقات»: GET /subscriptions with a status chip row and a server-side student-name search. */
export function SubscriptionsList() {
  const { color } = useTheme();
  const [filter, setFilter] = useState<SubscriptionFilter>('all');
  const [search, setSearch] = useState('');
  const threshold = useRenewalThreshold();
  const list = usePagedList<SubscriptionView>({
    path: '/subscriptions',
    params: subscriptionParams(filter, search),
  });
  // A new threshold redraws the rows (it is in their chip); a refetch of one page does not. Keyed by the
  // package: FlashList recycles a row, which would carry an open «إلغاء الباقة» confirm onto another one.
  const renderItem = useCallback(
    ({ item }: { item: SubscriptionView }) => (
      <SubscriptionItem key={item.id} sub={item} {...(threshold === undefined ? {} : { threshold })} />
    ),
    [threshold],
  );
  const empty = search ? t.common.notFound : t.mobileMoney.subscriptionsEmpty;
  return (
    <>
      <SearchField onSearch={setSearch} label={t.mobileMoney.searchStudent} />
      <FilterPills items={PILLS} value={filter} onChange={setFilter} accessibilityLabel={t.mobileMoney.statusFilter} />
      <LazyList
        paged={list}
        tabBar={false}
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
