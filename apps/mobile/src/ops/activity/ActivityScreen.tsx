import type { ActivityView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { LazyList } from '@/core/ui/lists/LazyList';

const keyOf = (r: ActivityView) => r.id;
const renderRow = ({ item }: { item: ActivityView }) => <ActivityRow row={item} />;
const back = () => (router.canGoBack() ? router.back() : router.replace('/more'));

/**
 * «سجل النشاط» (R-NFR-08, admin only): GET /activity, newest first, 25 a page. Filters are the API's
 * own (role, item, from / to day); the phone has no column sort. Offline the loaded rows stay. The list
 * screens' compact top (owner 2026-10-28): «سجل النشاط · 120», the last update under it only when offline.
 */
export function ActivityScreen() {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const [filters, setFilters] = useState<ActivityFilters>(NO_FILTERS);
  const list = usePagedList<ActivityView>({ path: '/activity', params: filterParams(filters) });
  const stale = list.isError && list.data !== undefined;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle, tz)) : undefined;
  return (
    <Screen list>
      <ScreenHeader
        title={t.activity.title}
        size="h2"
        connecting
        count={list.data ? list.total : undefined}
        subtitle={subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
        ListHeaderComponent={
          <ActivityFilterBar value={filters} onChange={setFilters} />
        }
        keyboardShouldPersistTaps="handled"
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
