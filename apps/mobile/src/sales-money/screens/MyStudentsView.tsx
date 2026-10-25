import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { LoadState } from '../components/LoadState';
import { useMyStudents } from '../lib/my-api';
import { MyStudentItem } from '../components/MyStudentItem';

/** «طلابي» (web MyStudents): the students I brought, newest first; GET /sales/me/students only. */
export function MyStudentsView() {
  const list = useMyStudents();
  const inset = useTabBarInset();
  const S = t.assistantPortal.students;
  return (
    <FlatList
      accessibilityLabel={S.list}
      style={{ flex: 1, marginHorizontal: -16 }}
      contentContainerStyle={{ paddingBottom: 24 + inset }}
      data={list.data ?? []}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <MyStudentItem student={item} />}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={S.empty} emptyHint={S.emptyHint} />}
    />
  );
}
