import type { ActivityView } from '@ab/shared';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { clockAt } from '@/inbox/shared/format';
import {
  BackButton,
  EmptyState,
  ErrorState,
  LazyList,
  Screen,
  ScreenHeader,
  t,
} from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { ActivityFilterBar } from './ActivityFilterBar';
import { ActivityRow } from './ActivityRow';
import { filterParams, isFiltered, NO_FILTERS, type ActivityFilters } from './activity-filters';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

const keyOf = (r: ActivityView) => r.id;
const renderRow = ({ item }: { item: ActivityView }) => <ActivityRow row={item} />;
const back = () => backWithin('/more');

/** R-NFR-08: admin only, 25 per page; filters are the API's; offline keeps loaded rows. */
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
        leading={<BackButton onPress={back} />}
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
