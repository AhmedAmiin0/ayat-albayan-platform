import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminNav } from '@/components/AdminNav';
import { AppShell } from '@/components/AppShell';
import { useNavCounts } from '@/components/shell/use-nav-counts';
import { adminRedirect } from '@/features/auth/admin-access';
import { requireRole } from '@/features/auth/me';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/admin')({
  // Base role admin gets the admin app; each page then needs its permission (features/auth/admin-access).
  beforeLoad: async ({ context, location }) => {
    const me = await requireRole(context.queryClient, 'admin');
    const to = adminRedirect(me, location.pathname);
    if (to && to !== location.pathname) throw redirect({ to });
  },
  component: AdminLayout,
});

// TODO(R-RPT-01): the /admin home becomes the dashboard (KPI strip) in Phase 5.
function AdminLayout() {
  const { can } = usePermissions();
  const counts = useNavCounts(can);
  return <AppShell title={t.admin.dashboardTitle} nav={<AdminNav counts={counts} can={can} />} />;
}
