import { createFileRoute } from '@tanstack/react-router';
import { parseTeacherHomeSearch, TeacherDashboard } from '@/features/teaching/teacher';

/** /teacher?tab= — «طلابي», today, the week, her availability (R-TCH-03, R-SCH-08, docs/48). */
export const Route = createFileRoute('/teacher/')({
  validateSearch: parseTeacherHomeSearch,
  component: TeacherHome,
});

function TeacherHome() {
  const { tab = 'students' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onTab = (next: typeof tab) => void navigate({ search: { tab: next }, replace: true });
  return <TeacherDashboard tab={tab} onTab={onTab} />;
}
