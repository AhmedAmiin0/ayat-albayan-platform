import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { StudentReportsPage } from '@/features/reporting/reports/history/StudentReportsPage';
import { StudentRecordings } from '@/features/people/students/recordings/StudentRecordings';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { TrialChatNote } from '@/features/teaching/teacher/lessons/TrialChatNote';
import { useViewerTz } from '@/lib/viewer-tz';

/** /teacher/reports/$studentId — one of my students' report history + grade chart (R-REP-05). */
export const Route = createFileRoute('/teacher/reports/$studentId')({ component: TeacherStudentReportsRoute });

function TeacherStudentReportsRoute() {
  const { studentId } = Route.useParams();
  const me = useQuery(teacherMeQuery);
  const viewer = useViewerTz();
  const student = me.data?.students.find((s) => s.id === studentId);
  return (
    <>
      <StudentReportsPage
        studentId={studentId}
        name={student?.name}
        role="teacher"
        tz={me.data?.tz ?? viewer}
        notice={<TrialChatNote status={student?.status} />}
      />
      <StudentRecordings studentId={studentId} role="teacher" />
    </>
  );
}
