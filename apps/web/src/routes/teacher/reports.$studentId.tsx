import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { StudentReportsPage } from '@/features/reports/StudentReportsPage';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { teacherMeQuery } from '@/features/teacher/api';

/** /teacher/reports/$studentId — one of my students' report history + grade chart (R-REP-05). */
export const Route = createFileRoute('/teacher/reports/$studentId')({ component: TeacherStudentReportsRoute });

function TeacherStudentReportsRoute() {
  const { studentId } = Route.useParams();
  const me = useQuery(teacherMeQuery);
  const name = me.data?.students.find((s) => s.id === studentId)?.name;
  return <StudentReportsPage studentId={studentId} name={name} role="teacher" tz={me.data?.tz ?? RIYADH_TZ} />;
}
