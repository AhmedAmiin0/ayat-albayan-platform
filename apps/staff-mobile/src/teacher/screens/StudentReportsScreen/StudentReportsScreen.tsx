import { useLocalSearchParams } from 'expo-router';
import { t, Screen, ScreenHeader, BackButton } from '@ab/mobile-kit';
import { backWithin } from '@/core/nav/back-within';
import { useStudentName } from '@/ops/reports/use-student-name';
import { ReportsPane } from '@/teacher/student-file';

/** Every sent report (R-REP-05), opening read-only; teachers use the student file (docs/47). */
export function StudentReportsScreen() {
  const id = useLocalSearchParams<{ id?: string }>().id ?? '';
  const name = useStudentName(id, true) ?? t.reports.history;
  return (
    <Screen>
      <ScreenHeader
        title={name}
        size="h2"
        connecting
        subtitle={t.reports.history}
        leading={<BackButton onPress={() => backWithin(`/students/${id}`)} />}
      />
      <ReportsPane id={id} who={{ admin: true }} />
    </Screen>
  );
}
