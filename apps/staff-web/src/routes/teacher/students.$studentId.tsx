import { createFileRoute } from '@tanstack/react-router';
import { TeacherStudentFile } from '@/features/teaching/teacher-students';

/** No tabs (docs/47, docs/49), so a stale ?tab= from an old link is ignored. */
export const Route = createFileRoute('/teacher/students/$studentId')({
  component: TeacherStudentFileRoute,
});

function TeacherStudentFileRoute() {
  const { studentId } = Route.useParams();
  return <TeacherStudentFile studentId={studentId} />;
}
