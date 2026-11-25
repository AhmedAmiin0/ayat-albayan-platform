import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { StudentReportsPage } from '@/features/reporting/reports/history/StudentReportsPage';
import { studentQuery } from '@/features/people/students/api';
import { useViewerTz } from '@ab/web-kit';

/** `$studentId_` keeps it out of the profile page, which has no Outlet (R-REP-05, issue D2). */
export const Route = createFileRoute('/admin/students/$studentId_/reports')({ component: AdminStudentReportsRoute });

function AdminStudentReportsRoute() {
  const { studentId } = Route.useParams();
  const children = useChildMatches();
  const student = useQuery({ ...studentQuery(studentId), enabled: children.length === 0 });
  const tz = useViewerTz();
  if (children.length > 0) return <Outlet />;
  return <StudentReportsPage studentId={studentId} name={student.data?.name} role="admin" tz={tz} />;
}
