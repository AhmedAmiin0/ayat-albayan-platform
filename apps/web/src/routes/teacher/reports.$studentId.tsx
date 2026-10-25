import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { StudentReportsPage } from '@/features/reports/StudentReportsPage';
import { StudentRecordings } from '@/features/students/recordings/StudentRecordings';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { teacherMeQuery } from '@/features/teacher/api';
import { TrialChatNote } from '@/features/teacher/TrialChatNote';

/** /teacher/reports/$studentId — one of my students' report history + grade chart (R-REP-05). */
export const Route = createFileRoute('/teacher/reports/$studentId')({ component: TeacherStudentReportsRoute });

function TeacherStudentReportsRoute() {
  const { studentId } = Route.useParams();
  const me = useQuery(teacherMeQuery);
  const student = me.data?.students.find((s) => s.id === studentId);
  return (
    <>
      <StudentReportsPage
        studentId={studentId}
        name={student?.name}
        role="teacher"
        tz={me.data?.tz ?? RIYADH_TZ}
        notice={<TrialChatNote status={student?.status} />}
      />
      <StudentRecordings studentId={studentId} role="teacher" />
    </>
  );
}
