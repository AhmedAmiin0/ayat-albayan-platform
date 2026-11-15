import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * /teacher/reports/$studentId — the old «سجل التقارير» address: it opens the student file
 * (docs/49: no tabs, each report inside its lesson), keeping a #recording-<id> hash that opens
 * that lesson's row (router-core resolveRedirect → buildLocation builds the href with it).
 */
export const Route = createFileRoute('/teacher/reports/$studentId')({
  beforeLoad: ({ params, location }) => {
    redirect({
      to: '/teacher/students/$studentId',
      params,
      hash: location.hash,
      throw: true,
    });
  },
});
