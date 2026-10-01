import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'admin'),
  component: () => <AppShell title={t.admin.dashboardTitle} />,
});
