import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * /teacher/reports/$studentId — the old «سجل التقارير» address: it opens the student file on
 * «التقارير» (docs/47), keeping a #recording-<id> hash (the router builds the redirect's href
 * with it, router-core resolveRedirect → buildLocation).
 */
export const Route = createFileRoute('/teacher/reports/$studentId')({
  beforeLoad: ({ params, location }) => {
    redirect({
      to: '/teacher/students/$studentId',
      params,
      search: { tab: 'reports' },
      hash: location.hash,
      throw: true,
    });
  },
});
