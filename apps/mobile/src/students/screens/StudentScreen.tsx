import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { AssistantsSection } from '@/classroom/assistants/AssistantsSection';
import { ApiError, apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { StudentFileSections } from '@/student-file/components/StudentFileSections';
import { TrialDateSection } from '@/trial-date/components/TrialDateSection';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BalanceCard } from '../profile/BalanceCard';
import { GuardianCard } from '../profile/GuardianCard';
import { RenewButton } from '../profile/RenewButton';
import { SiblingsList } from '../profile/SiblingsList';
import { StatusChanger } from '../profile/StatusChanger';
import { StudentFacts } from '../profile/StudentFacts';
import type { StudentProfile } from '../shared/types';

const back = () => (router.canGoBack() ? router.back() : router.replace('/students'));

/**
 * Student quick view (R-MOB-02) on GET /students/:id. The status changes here, and a payment is
 * recorded from the balance card, «جدّد الاشتراك» once the package ended; editing, adding and merging stay on the web.
 * «موعد تجريبي جديد» and the trial dates' history in TrialDateSection (R-STU-05).
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
        <RenewButton student={student} />
        <Button
          variant="secondary"
          label={t.mobileAdmin.reports.button}
          onPress={() => router.push(`/students/reports/${student.id}`)}
        />
        <BalanceCard studentId={student.id} />
        <StudentFileSections student={student} />
        <TrialDateSection student={student} />
        <StudentFacts student={student} />
        <GuardianCard guardian={student.guardian} />
        <SiblingsList siblings={student.siblings} />
        <AssistantsSection studentId={student.id} />
      </ScrollView>
    </Screen>
  );
}
