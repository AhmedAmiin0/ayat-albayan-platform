import { createFileRoute } from '@tanstack/react-router';
import { AdminNav } from '@/components/AdminNav';
import { AppShell } from '@/components/AppShell';
import { useNavCounts } from '@/components/shell/use-nav-counts';
import { requireRole } from '@/features/auth/me';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'admin'),
  component: AdminLayout,
});

// TODO(R-RPT-01): the /admin home becomes the dashboard (KPI strip) in Phase 5.
function AdminLayout() {
  const counts = useNavCounts();
  return <AppShell title={t.admin.dashboardTitle} nav={<AdminNav counts={counts} />} />;
}
