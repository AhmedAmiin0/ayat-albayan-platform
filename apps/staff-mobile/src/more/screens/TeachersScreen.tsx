import { t, EmptyState, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { TeacherRow } from '@/more/teachers/TeacherRow';
import type { TeacherListRow } from '@ab/shared';

const keyOf = (teacher: TeacherListRow) => teacher.id;
const renderRow = ({ item }: { item: TeacherListRow }) => <TeacherRow teacher={item} />;

/**
 * «المعلمين», read-only (R-TCH-01). GET /teachers pages by name and has no search or status filter
 * yet, so neither is offered here. Tap → the teacher's view; a «مشترك n» / «تجريبي n» count opens it on
 * that list. The list screens' compact top (owner 2026-10-28): «المعلمين · 12» on the title's line.
 */
export function TeachersScreen() {
  const list = usePagedList<TeacherListRow>({ path: '/teachers' });
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
