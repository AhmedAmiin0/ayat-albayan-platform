import { createFileRoute } from '@tanstack/react-router';
import { TeacherEarningsPage } from '@/features/finance/teacher-earnings/TeacherEarningsPage';

export const Route = createFileRoute('/admin/teachers/$teacherId_/earnings')({ component: EarningsRoute });

function EarningsRoute() {
  const { teacherId } = Route.useParams();
  return <TeacherEarningsPage teacherId={teacherId} />;
}
