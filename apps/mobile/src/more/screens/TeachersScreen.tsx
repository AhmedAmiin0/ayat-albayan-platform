import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/layout/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { TeacherRow } from '../teachers/TeacherRow';
import type { TeacherListItem } from '../types';

const keyOf = (teacher: TeacherListItem) => teacher.id;
const renderRow = ({ item }: { item: TeacherListItem }) => <TeacherRow teacher={item} />;

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
      <LazyList
        tabBar={false}
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
