import { createFileRoute, redirect } from '@tanstack/react-router';

/** Old address kept as a redirect to /sales/students. */
export const Route = createFileRoute('/sales/all-students')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/students' });
  },
});
