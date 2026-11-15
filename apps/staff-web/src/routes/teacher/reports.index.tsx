import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * /teacher/reports — the old «التقارير» page (docs/49): each report now opens inside its lesson
 * in the student file, so the address sends the teacher to «الطلاب» and drops any old list search.
 */
export const Route = createFileRoute('/teacher/reports/')({
  beforeLoad: () => {
    redirect({ to: '/teacher/students', throw: true });
  },
});
