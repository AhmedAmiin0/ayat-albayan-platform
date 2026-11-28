import { t, EmptyState, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { TeacherRow } from '@/more/teachers/TeacherRow';
import { teachers } from '@/more/teachers/teacher-calls';
import type { TeacherListRow } from '@ab/shared';

const keyOf = (teacher: TeacherListRow) => teacher.id;
const renderRow = ({ item }: { item: TeacherListRow }) => <TeacherRow teacher={item} />;

/** R-TCH-01: GET /teachers has no search or status filter yet, so none is offered. */
export function TeachersScreen() {
  const list = usePagedList<TeacherListRow>({ path: '/teachers', read: teachers.list });
  return (
    <Screen list>
      <ScreenHeader title={t.nav.teachers} size="h2" connecting count={list.data ? list.total : undefined} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
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
