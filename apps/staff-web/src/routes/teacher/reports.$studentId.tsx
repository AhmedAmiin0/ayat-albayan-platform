import { createFileRoute, redirect } from '@tanstack/react-router';

/** Old address redirecting to the student file (docs/49), keeping a #recording-<id> hash. */
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
