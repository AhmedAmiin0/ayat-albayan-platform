import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { parseStudentsSearch } from '@/features/students/search';
import { StudentsPage } from '@/features/students/StudentsPage';

/** /admin/students — list; also the parent of /admin/students/$studentId (renders it via Outlet). */
export const Route = createFileRoute('/admin/students')({
  validateSearch: parseStudentsSearch,
  component: StudentsRoute,
});

function StudentsRoute() {
  const children = useChildMatches();
  const { search = '', page = 1, ...filters } = Route.useSearch();
  const navigate = Route.useNavigate();
  if (children.length > 0) return <Outlet />;

  return (
    <StudentsPage
      search={search}
      page={page}
      filters={filters}
      onChange={(next) =>
        void navigate({
          search: parseStudentsSearch({ ...next.filters, search: next.search, page: next.page }),
        })
      }
      onOpen={(studentId) => void navigate({ to: '/admin/students/$studentId', params: { studentId } })}
    />
  );
}
