import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { ApiError, apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { GuardianCard } from './GuardianCard';
import { SiblingsList } from './SiblingsList';
import { StatusChanger } from './StatusChanger';
import { StudentFacts } from './StudentFacts';
import type { StudentProfile } from './types';

const back = () => (router.canGoBack() ? router.back() : router.replace('/students'));

/**
 * Student quick view (R-MOB-02) on GET /students/:id. Only the status changes here; editing, adding
 * and merging stay on the web. TODO(R-MOB-02): «حجز حلقة تجريبية» (quick book trial) with Phase 2.
 */
export function StudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = `/students/${id}`;
  const query = useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<StudentProfile>(path),
  });
  const student = query.data;
  const backButton = <Button variant="ghost" label={t.common.back} onPress={back} />;

  if (!student) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen>
        <ScreenHeader title={t.students.profile} trailing={backButton} />
        {query.isError ? (
          <ErrorState
            onRetry={() => void query.refetch()}
            message={notFound ? t.common.notFound : undefined}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={student.name}
        subtitle={student.code ? ltr(student.code) : undefined}
        trailing={backButton}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        <StatusChanger student={student} />
        <StudentFacts student={student} />
        <GuardianCard guardian={student.guardian} />
        <SiblingsList siblings={student.siblings} />
      </ScrollView>
    </Screen>
  );
}
