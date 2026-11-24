import type { AdminTaskView } from '@ab/money';
import { ActivityIndicator } from 'react-native';
import { t, useTheme, EmptyState, ErrorState } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { TaskItem } from './TaskItem';

const keyOf = (task: AdminTaskView) => task.id;
const renderRow = ({ item }: { item: AdminTaskView }) => <TaskItem task={item} />;

/** Read-only; the web marks tasks done. */
export function TasksList() {
  const { color } = useTheme();
  const list = usePagedList<AdminTaskView>({ path: '/admin-tasks', params: { open: 'true' } });
  return (
    <LazyList
      paged={list}
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
