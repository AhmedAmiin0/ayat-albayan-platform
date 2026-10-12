import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { TeacherRow } from './TeacherRow';
import type { TeacherListItem } from './types';

/**
 * «المعلمين», read-only (R-TCH-01). GET /teachers pages by name and has no search or status filter
 * yet, so neither is offered here. Tap → the teacher's view; a «مشترك n» / «تجريبي n» count opens it on
 * that list.
 */
export function TeachersScreen() {
  const list = usePagedList<TeacherListItem>({ path: '/teachers' });
  const count = list.data ? t.teachers.count.replace('{n}', String(list.total)) : undefined;
  return (
    <Screen>
      <ScreenHeader title={t.nav.teachers} subtitle={count} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(teacher) => teacher.id}
        renderItem={({ item }) => <TeacherRow teacher={item} />}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.isPending ? null : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <EmptyState title={t.teachers.empty} />
          )
        }
      />
    </Screen>
  );
}
