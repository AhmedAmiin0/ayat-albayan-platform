import { createFileRoute, redirect } from '@tanstack/react-router';

/** The old /sales/all-students page: «الطلاب» lives at /sales/students now. */
export const Route = createFileRoute('/sales/all-students')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/students' });
  },
});
