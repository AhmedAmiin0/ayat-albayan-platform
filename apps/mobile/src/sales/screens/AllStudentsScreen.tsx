import type { SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { CheckRegistrationButton } from '@/registration-check/components/CheckRegistrationButton';
import { MyStudentsView } from '@/sales-money/screens/MyStudentsView';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { AllStudentRow } from '../components/AllStudentRow';

export type StudentsView = 'all' | 'mine';

const VIEWS = (): { value: StudentsView; label: string }[] => [
  { value: 'all', label: t.sales.allStudents.title },
  { value: 'mine', label: t.assistantPortal.nav.students },
];

const keyOf = (s: SalesStudentView) => s.id;
// Keyed by the student: «no phone» under a tapped row is its own state, never a recycled row's.
const renderRow = ({ item }: { item: SalesStudentView }) => <AllStudentRow key={item.id} student={item} />;

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
    <Screen list>
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
        <LazyList
          paged={list}
          keyExtractor={keyOf}
          renderItem={renderRow}
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
