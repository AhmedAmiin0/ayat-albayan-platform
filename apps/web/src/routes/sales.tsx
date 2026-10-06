import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { usePermissions } from '@/features/auth/use-permissions';
import { SALES_NAV_ITEMS, SalesNav } from '@/features/sales/SalesNav';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/sales')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'sales'),
  component: () => <AppShell title={t.assistantPortal.title} home="/sales" titles={SALES_NAV_ITEMS} topNav={<SalesNavGated />} />,
});

/** The nav shows only the pages the held role's permissions open (dynamic roles), row and sheet. */
function SalesNavGated() {
  const { can } = usePermissions();
  return <SalesNav can={can} />;
}
