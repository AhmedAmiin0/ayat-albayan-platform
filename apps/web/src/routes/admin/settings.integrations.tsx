import { createFileRoute } from '@tanstack/react-router';
import { IntegrationsPage } from '@/features/settings/pages/IntegrationsPage';

/** /admin/settings/integrations — docs/26b §3: its section on its own short page. */
export const Route = createFileRoute('/admin/settings/integrations')({
  component: IntegrationsPage,
});
