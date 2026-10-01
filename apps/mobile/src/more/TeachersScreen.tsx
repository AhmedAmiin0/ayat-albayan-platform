import { teacherStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StatusChip } from '@/ui/StatusChip';
import type { Teacher } from './types';

/**
 * «المعلمين», read-only (R-TCH-01). GET /teachers pages by name and has no search or status filter
 * yet, so neither is offered here. Tap → the teacher's view.
 */
export function TeachersScreen() {
  const list = usePagedList<Teacher>({ path: '/teachers' });
  const count = list.data ? t.teachers.count.replace('{n}', String(list.total)) : undefined;
  return (
    <Screen>
      <ScreenHeader title={t.nav.teachers} subtitle={count} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(teacher) => teacher.id}
        renderItem={({ item }) => (
          <ListRow
            title={item.display_name_ar}
            trailing={
              <StatusChip
                {...teacherStatusStyle[item.status]}
                label={t.enums.teacherStatus[item.status]}
              />
            }
            onPress={() => router.push(`/more/teachers/${item.id}`)}
          />
        )}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.isPending ? null : list.isError ? (
            <ErrorState onRetry={() => void list.refetch()} />
          ) : (
            <EmptyState title={t.teachers.empty} />
          )
        }
      />
    </Screen>
  );
}
