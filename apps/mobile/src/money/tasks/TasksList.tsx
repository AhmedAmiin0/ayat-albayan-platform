import type { AdminTaskView } from '@ab/shared';
import { ActivityIndicator } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { TaskItem } from './TaskItem';

const keyOf = (task: AdminTaskView) => task.id;
const renderRow = ({ item }: { item: AdminTaskView }) => <TaskItem task={item} />;

/** «المهام»: GET /admin-tasks (open ones: renewal due, package unpaid). Read-only; the web marks them done. */
export function TasksList() {
  const { color } = useTheme();
  const list = usePagedList<AdminTaskView>({ path: '/admin-tasks', params: { open: 'true' } });
  return (
    <LazyList
      paged={list}
      tabBar={false}
      keyExtractor={keyOf}
      renderItem={renderRow}
      ListEmptyComponent={
        list.data ? (
          <EmptyState title={t.mobileMoney.tasksEmpty} />
        ) : list.isError ? (
          <ErrorState onRetry={list.refresh} />
        ) : (
          <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
        )
      }
    />
  );
}
