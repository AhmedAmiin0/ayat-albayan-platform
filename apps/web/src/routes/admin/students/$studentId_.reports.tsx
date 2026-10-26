import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { StudentReportsPage } from '@/features/reporting/reports/history/StudentReportsPage';
import { RIYADH_TZ } from '@/features/teaching/schedule/tz';
import { studentQuery } from '@/features/people/students/api';

/**
 * /admin/students/$studentId/reports — «سجل التقارير» + grade chart (R-REP-05, issue D2).
 * `$studentId_` keeps it out of the profile page (no Outlet there); it renders inside the students
 * route, and is the parent of the admin's report form (renders it via Outlet).
 */
export const Route = createFileRoute('/admin/students/$studentId_/reports')({ component: AdminStudentReportsRoute });

function AdminStudentReportsRoute() {
  const { studentId } = Route.useParams();
  const children = useChildMatches();
  const student = useQuery({ ...studentQuery(studentId), enabled: children.length === 0 });
  if (children.length > 0) return <Outlet />;
  return <StudentReportsPage studentId={studentId} name={student.data?.name} role="admin" tz={RIYADH_TZ} />;
}
