import type { SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  BackButton,
  EmptyState,
  ErrorState,
  FilterPills,
  LazyList,
  Screen,
  ScreenHeader,
  t,
  useTheme,
} from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { CheckRegistrationButton } from '@/registration-check/components/CheckRegistrationButton';
import { MyStudentsView } from '@/sales-money/screens/MyStudentsView';
import { SearchField } from '@/core/ui/form/SearchField';
import { AllStudentRow } from '@/sales/sales/components/AllStudentRow';

export type StudentsView = 'all' | 'mine';

const VIEWS = (): { value: StudentsView; label: string }[] => [
  { value: 'all', label: t.sales.allStudents.title },
  { value: 'mine', label: t.assistantPortal.nav.students },
];

const keyOf = (s: SalesStudentView) => s.id;
// Keyed by the student: «no phone» under a tapped row is its own state, never a recycled row's.
const renderRow = ({ item }: { item: SalesStudentView }) => (
  <AllStudentRow key={item.id} student={item} />
);

/** Every student, paged and searched on the server, read-only. */
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
        size="h2"
        connecting
        count={all && list.data ? list.total : undefined}
        leading={asTab ? undefined : <BackButton onPress={() => router.back()} />}
        trailing={
          asTab ? <CheckRegistrationButton icon href="/sales/students/registration-check" /> : undefined
        }
      />
      <FilterPills items={VIEWS()} value={view} onChange={(v) => {
          setView(v);
          setSearch('');
        }} accessibilityLabel={t.sales.views.students} />
      {all ? <SearchField compact onSearch={setSearch} label={t.sales.allStudents.search} /> : null}
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
              <ActivityIndicator
                accessibilityLabel={t.common.loading}
                color={color.lapis}
                style={{ paddingVertical: 32 }}
              />
            )
          }
        />
      ) : (
        <MyStudentsView />
      )}
    </Screen>
  );
}
