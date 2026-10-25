import type { ActivityView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { ActivityFilterBar } from './ActivityFilterBar';
import { ActivityRow } from './ActivityRow';
import { filterParams, isFiltered, NO_FILTERS, type ActivityFilters } from './activity-filters';

const back = () => (router.canGoBack() ? router.back() : router.replace('/more'));

/**
 * «سجل النشاط» (R-NFR-08, admin only): GET /activity, newest first, 25 a page. Filters are the API's
 * own (role, item, from / to day); the phone has no column sort. Offline the loaded rows stay.
 */
export function ActivityScreen() {
  const [filters, setFilters] = useState<ActivityFilters>(NO_FILTERS);
  const list = usePagedList<ActivityView>({ path: '/activity', params: filterParams(filters) });
  const stale = list.isError && list.data !== undefined;
  const count = list.data ? t.activity.count.replace('{n}', String(list.total)) : undefined;
  const subtitle =
    stale && count
      ? `${count} · ${t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt))}`
      : count;
  return (
    <Screen>
      <ScreenHeader
        title={t.activity.title}
        subtitle={subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ActivityRow row={item} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <ActivityFilterBar value={filters} onChange={setFilters} />
          </View>
        }
        keyboardShouldPersistTaps="handled"
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.data ? (
            <EmptyState
              title={isFiltered(filters) ? t.mobileAdmin.activity.emptyFiltered : t.activity.empty}
            />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : null
        }
      />
    </Screen>
  );
}
