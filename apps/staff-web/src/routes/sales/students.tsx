import { createFileRoute } from '@tanstack/react-router';
import { SalesStudents } from '@/features/sales/sales/students/SalesStudents';
import { parseStudentsSearch } from '@/features/sales/sales/search';
import { SalesChannelDialog } from '@/features/teaching/student-channel';

/**
 * /sales/students?view=mine «الطلاب» — every student of the academy; «طلابي» is a filter.
 * `?chat=<id>` opens that student's chat over the list (a chat push lands here).
 */
export const Route = createFileRoute('/sales/students')({
  validateSearch: parseStudentsSearch,
  component: SalesStudentsRoute,
});

function SalesStudentsRoute() {
  const { view = 'all', chat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const toView = (next: 'all' | 'mine') => void navigate({ search: next === 'mine' ? { view: next } : {} });
  return (
    <>
      <SalesStudents view={view} onView={toView} />
      {chat && <SalesChannelDialog studentId={chat} onClose={() => toView(view)} />}
    </>
  );
}
