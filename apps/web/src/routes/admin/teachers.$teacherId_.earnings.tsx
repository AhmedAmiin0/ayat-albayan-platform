import { createFileRoute } from '@tanstack/react-router';
import { TeacherEarningsPage } from '@/features/teacher-earnings/TeacherEarningsPage';

/** /admin/teachers/:teacherId/earnings «مستحقات المعلم» — pay per session, receipts, history. */
export const Route = createFileRoute('/admin/teachers/$teacherId_/earnings')({ component: EarningsRoute });

function EarningsRoute() {
  const { teacherId } = Route.useParams();
  return <TeacherEarningsPage teacherId={teacherId} />;
}
