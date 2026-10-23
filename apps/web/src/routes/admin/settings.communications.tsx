import { createFileRoute } from '@tanstack/react-router';
import { CommunicationsPage } from '@/features/settings/pages/CommunicationsPage';

/** /admin/settings/communications — docs/26b §3: its section on its own short page. */
export const Route = createFileRoute('/admin/settings/communications')({
  component: CommunicationsPage,
});
