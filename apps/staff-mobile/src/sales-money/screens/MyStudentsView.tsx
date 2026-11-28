import type { MyStudentRow } from '@ab/money';
import { t, LazyList } from '@ab/mobile-kit';
import { LoadState } from '@/sales-money/components/LoadState';
import { useMyStudents } from '@/sales-money/lib/my-api';
import { MyStudentItem } from '@/sales-money/components/MyStudentItem';

const renderRow = ({ item }: { item: MyStudentRow }) => <MyStudentItem student={item} />;

export function MyStudentsView() {
  const list = useMyStudents();
  const S = t.assistantPortal.students;
  return (
    <LazyList
      accessibilityLabel={S.list}
      data={list.data ?? []}
      keyExtractor={(s) => s.id}
      renderItem={renderRow}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={S.empty} emptyHint={S.emptyHint} />}
    />
  );
}
