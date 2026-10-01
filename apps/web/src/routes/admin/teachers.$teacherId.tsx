import { createFileRoute } from '@tanstack/react-router';
import { TeacherDetailPage } from '@/features/teachers/TeacherDetailPage';

/** /admin/teachers/:teacherId — profile, availability grid, time-off (R-TCH-01, R-TCH-02). */
export const Route = createFileRoute('/admin/teachers/$teacherId')({
  component: TeacherRoute,
});

function TeacherRoute() {
  const { teacherId } = Route.useParams();
  return <TeacherDetailPage teacherId={teacherId} />;
}
