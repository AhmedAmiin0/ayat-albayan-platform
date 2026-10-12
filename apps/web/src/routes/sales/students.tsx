import { createFileRoute } from '@tanstack/react-router';
import { SalesStudents } from '@/features/sales/SalesStudents';
import { parseStudentsSearch } from '@/features/sales/search';

/** /sales/students?view=mine «الطلاب» — every student of the academy; «طلابي» is a filter. */
export const Route = createFileRoute('/sales/students')({
  validateSearch: parseStudentsSearch,
  component: SalesStudentsRoute,
});

function SalesStudentsRoute() {
  const { view = 'all' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <SalesStudents view={view} onView={(next) => void navigate({ search: next === 'mine' ? { view: next } : {} })} />;
}
