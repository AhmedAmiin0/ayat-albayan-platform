import { router } from 'expo-router';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useSalesTeachers } from './sales-api';
import { SalesTeacherRow } from './SalesTeacherRow';

/** «المعلمون» of the salesperson (web /sales/teachers): every active teacher with their students, read-only. */
export function SalesTeachersScreen() {
  const { color } = useTheme();
  const list = useSalesTeachers();
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.teachers.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.data ?? []}
        keyExtractor={(tc) => tc.id}
        renderItem={({ item }) => <SalesTeacherRow teacher={item} />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.sales.teachers.empty} />
          ) : list.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void list.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
