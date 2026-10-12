import type { SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { CheckRegistrationButton } from '@/registration-check/CheckRegistrationButton';
import { MyStudentsView } from '@/sales-money/MyStudentsView';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { AllStudentRow } from './AllStudentRow';

export type StudentsView = 'all' | 'mine';

const VIEWS = (): { value: StudentsView; label: string }[] => [
  { value: 'all', label: t.sales.allStudents.title },
  { value: 'mine', label: t.assistantPortal.nav.students },
];

/**
 * «كل الطلاب» of the salesperson (web /sales/students, SalesStudents): every student of the academy,
 * paged and searched on the server (name or code), read-only; «طلابي» is a filter of the same page
 * (GET /sales/me/students: the ones I brought, paid or not, my commission). Scrolling loads the next page.
 * `asTab`: the sales tree's «الطلاب» tab, a tab root with no «رجوع» («تحقق من التسجيل» there instead).
 */
export function AllStudentsScreen({ asTab = false }: { asTab?: boolean }) {
  const { color } = useTheme();
  const [view, setView] = useState<StudentsView>('all');
  const [search, setSearch] = useState('');
  const list = usePagedList<SalesStudentView>({ path: '/sales/students/all', params: { search } });
  const all = view === 'all';
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.allStudents.title}
        subtitle={all && list.data ? t.students.count.replace('{n}', String(list.total)) : undefined}
        trailing={
          asTab ? (
            <CheckRegistrationButton href="/sales/students/registration-check" />
          ) : (
            <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />
          )
        }
      />
      <FilterPills items={VIEWS()} value={view} onChange={(v) => {
          setView(v);
          setSearch('');
        }} accessibilityLabel={t.sales.views.students} />
      {all ? <SearchField onSearch={setSearch} label={t.sales.allStudents.search} /> : null}
      {all ? (
        <FlatList
          style={{ flex: 1, marginHorizontal: -16 }}
          data={list.items}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <AllStudentRow student={item} />}
          onEndReached={list.loadMore}
          refreshing={list.isRefetching}
          onRefresh={list.refresh}
          ListEmptyComponent={
            list.data ? (
              <EmptyState title={t.sales.allStudents.empty} />
            ) : list.isError ? (
              <ErrorState message={t.sales.loadFailed} onRetry={list.refresh} />
            ) : (
              <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
            )
          }
        />
      ) : (
        <MyStudentsView />
      )}
    </Screen>
  );
}
