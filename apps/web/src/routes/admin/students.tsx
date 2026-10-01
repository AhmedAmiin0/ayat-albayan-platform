import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { StudentsPage } from '@/features/students/StudentsPage';

type Search = { search?: string; page?: number };

/** /admin/students — list; also the parent of /admin/students/$studentId (renders it via Outlet). */
export const Route = createFileRoute('/admin/students')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    search: typeof s['search'] === 'string' && s['search'] ? s['search'] : undefined,
    page: Number(s['page']) > 1 ? Math.floor(Number(s['page'])) : undefined,
  }),
  component: StudentsRoute,
});

function StudentsRoute() {
  const children = useChildMatches();
  const { search = '', page = 1 } = Route.useSearch();
  const navigate = Route.useNavigate();
  if (children.length > 0) return <Outlet />;

  return (
    <StudentsPage
      search={search}
      page={page}
      onChange={(next) =>
        void navigate({ search: { search: next.search || undefined, page: next.page > 1 ? next.page : undefined } })
      }
      onOpen={(studentId) => void navigate({ to: '/admin/students/$studentId', params: { studentId } })}
    />
  );
}
