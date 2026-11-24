import { createFileRoute, redirect } from '@tanstack/react-router';

/** Old address (docs/49): sends the teacher to her students and drops any old list search. */
export const Route = createFileRoute('/teacher/reports/')({
  beforeLoad: () => {
    redirect({ to: '/teacher/students', throw: true });
  },
});
