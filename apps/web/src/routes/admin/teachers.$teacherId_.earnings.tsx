import { createFileRoute } from '@tanstack/react-router';
import { TeacherEarningsPage } from '@/features/teacher-earnings/TeacherEarningsPage';

/**
 * /admin/teachers/$teacherId/earnings — «مستحقات»: per-session balance and payments (R-TCH-04).
 * `$teacherId_` keeps it out of the profile page (no Outlet there); the teachers route renders it.
 */
export const Route = createFileRoute('/admin/teachers/$teacherId_/earnings')({ component: EarningsRoute });

function EarningsRoute() {
  const { teacherId } = Route.useParams();
  return <TeacherEarningsPage teacherId={teacherId} />;
}
