import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { SALES_NAV_ITEMS, SalesNav } from '@/features/sales/SalesNav';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/sales')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'sales'),
  component: () => <AppShell title={t.sales.title} home="/sales" titles={SALES_NAV_ITEMS} topNav={<SalesNav />} />,
});
