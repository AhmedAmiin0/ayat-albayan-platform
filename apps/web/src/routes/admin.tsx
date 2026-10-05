import { createFileRoute } from '@tanstack/react-router';
import { ADMIN_NAV_ITEMS } from '@/components/admin-nav-items';
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
  return <AppShell title={t.admin.dashboardTitle} home="/admin" titles={TITLES} nav={<AdminNav counts={counts} />} />;
}

/** The compact bar's titles: every nav page, plus the booking wizard (opened from several pages). */
const TITLES = [...ADMIN_NAV_ITEMS, { to: '/admin/book', label: t.booking.title }];
