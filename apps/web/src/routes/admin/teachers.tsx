import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { TeachersPage } from '@/features/teachers/TeachersPage';

/** `?page=n` (1-based); omitted on page 1 so nav links need no search. */
function validateSearch(search: Record<string, unknown>): { page?: number } {
  const page = Number(search['page']);
  return Number.isInteger(page) && page > 1 ? { page } : {};
}

/** /admin/teachers — list (R-TCH-01). Parent of teachers.$teacherId, which replaces the list. */
export const Route = createFileRoute('/admin/teachers')({
  validateSearch,
  component: TeachersRoute,
});

function TeachersRoute() {
  const { page = 1 } = Route.useSearch();
  const navigate = useNavigate();
  const hasChild = useChildMatches().length > 0;
  const onOpen = useCallback(
    (teacherId: string) => void navigate({ to: '/admin/teachers/$teacherId', params: { teacherId } }),
    [navigate],
  );
  if (hasChild) return <Outlet />;
  return (
    <TeachersPage
      page={page}
      onOpen={onOpen}
      onPage={(p) => void navigate({ to: '/admin/teachers', search: { page: p } })}
    />
  );
}
