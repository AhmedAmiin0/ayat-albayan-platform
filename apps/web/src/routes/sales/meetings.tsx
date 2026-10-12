import { createFileRoute, redirect } from '@tanstack/react-router';

/** The old /sales/meetings page (owner 2026-10-12: removed): old links land on «جدول الحلقات». */
export const Route = createFileRoute('/sales/meetings')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/schedule' });
  },
});
