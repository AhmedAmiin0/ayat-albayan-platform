import { createFileRoute } from '@tanstack/react-router';
import { StudentProfilePage } from '@/features/students/profile/StudentProfilePage';

/** /admin/students/$studentId — student profile (R-STU-05). */
export const Route = createFileRoute('/admin/students/$studentId')({
  component: StudentProfileRoute,
});

function StudentProfileRoute() {
  const { studentId } = Route.useParams();
  return <StudentProfilePage studentId={studentId} />;
}
