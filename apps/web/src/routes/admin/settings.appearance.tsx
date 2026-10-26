import { createFileRoute } from '@tanstack/react-router';
import { AppearancePage } from '@/features/platform/settings/pages/AppearancePage';

/** /admin/settings/appearance — docs/26b §3: its section on its own short page. */
export const Route = createFileRoute('/admin/settings/appearance')({
  component: AppearancePage,
});
