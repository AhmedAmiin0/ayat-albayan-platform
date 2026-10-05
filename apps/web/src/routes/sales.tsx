import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { usePermissions } from '@/features/auth/use-permissions';
import { SalesNav } from '@/features/sales/SalesNav';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/sales')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'sales'),
  component: () => <AppShell title={t.sales.title} topNav={<SalesNavGated />} />,
});

/** The nav shows only the pages the held role's permissions open (dynamic roles). */
function SalesNavGated() {
  const { can } = usePermissions();
  return <SalesNav can={can} />;
}
