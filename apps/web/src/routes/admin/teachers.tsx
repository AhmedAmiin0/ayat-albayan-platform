import { TEACHER_FILTER_KEYS, TEACHER_SORT_KEYS } from '@ab/shared';
import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { TeachersPage } from '@/features/teachers/TeachersPage';
import { listUrlValidator, parseListUrl, toListUrl } from '@/lib/list/list-url';

const KEYS = { sortKeys: TEACHER_SORT_KEYS, filterKeys: TEACHER_FILTER_KEYS };

/** /admin/teachers — list (R-TCH-01). Parent of teachers.$teacherId, which replaces the list. */
export const Route = createFileRoute('/admin/teachers')({
  // `?page=n&sort=&dir=desc&f_<key>=` (R-NFR-08); defaults are omitted so nav links need no search.
  validateSearch: listUrlValidator(KEYS),
  component: TeachersRoute,
});

function TeachersRoute() {
  const list = parseListUrl(Route.useSearch(), KEYS);
  const navigate = useNavigate();
  const hasChild = useChildMatches().length > 0;
  const onOpen = useCallback(
    (teacherId: string) => void navigate({ to: '/admin/teachers/$teacherId', params: { teacherId } }),
    [navigate],
  );
  if (hasChild) return <Outlet />;
  return (
    <TeachersPage
      list={list}
      onOpen={onOpen}
      onList={(next) => void navigate({ to: '/admin/teachers', search: toListUrl(next) })}
    />
  );
}
