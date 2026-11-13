import { createFileRoute } from '@tanstack/react-router';
import { TeacherStudentFile } from '@/features/teaching/teacher-students';

/**
 * /teacher/students/$studentId «ملف الطالب» (docs/47, docs/49): lessons and course, each report
 * inside its lesson. No tabs, so a stale ?tab=… from an old link is simply ignored.
 */
export const Route = createFileRoute('/teacher/students/$studentId')({
  component: TeacherStudentFileRoute,
});

function TeacherStudentFileRoute() {
  const { studentId } = Route.useParams();
  return <TeacherStudentFile studentId={studentId} />;
}
