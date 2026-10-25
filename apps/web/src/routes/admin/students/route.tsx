import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { fromStudentsUrl, parseStudentsSearch, toStudentsUrl } from '@/features/students/list/search';
import { StudentsPage } from '@/features/students/list/StudentsPage';

/** /admin/students — list; also the parent of /admin/students/$studentId (renders it via Outlet). */
export const Route = createFileRoute('/admin/students')({
  validateSearch: parseStudentsSearch,
  component: StudentsRoute,
});

function StudentsRoute() {
  const children = useChildMatches();
  const state = fromStudentsUrl(Route.useSearch());
  const navigate = Route.useNavigate();
  if (children.length > 0) return <Outlet />;

  return (
    <StudentsPage
      {...state}
      onChange={(next) => void navigate({ search: toStudentsUrl(next) })}
      onOpen={(studentId) => void navigate({ to: '/admin/students/$studentId', params: { studentId } })}
    />
  );
}
