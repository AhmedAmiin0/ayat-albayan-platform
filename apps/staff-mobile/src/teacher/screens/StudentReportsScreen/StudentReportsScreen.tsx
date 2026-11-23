import { useLocalSearchParams } from 'expo-router';
import { t, Screen, ScreenHeader, BackButton } from '@ab/mobile-kit';
import { backWithin } from '@/core/nav/back-within';
import { useStudentName } from '@/ops/reports/use-student-name';
import { ReportsPane } from '@/teacher/student-file';

/**
 * The admin's «سجل التقارير» of a student (R-REP-05): every sent report, newest first, with its
 * PDF once it is ready; any report opens read-only. Compact h2 title, the rows in one inset card
 * (owner 2026-10-28). The teacher's way in is her student file (docs/47, TeacherStudentFileScreen).
 */
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
