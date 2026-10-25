import { usePermissions } from '@/auth/use-permissions';
import { useInboxBadge } from '@/core/nav/use-inbox-badge';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { AppNativeTabs } from '@/core/ui/layout/AppNativeTabs';
import { salesTabItems } from '../lib/sales-tabs';

/**
 * The phone app of the base role sales («المبيعات», owner 2026-10-12): its own tree under /sales,
 * mirroring the web sales portal. The shared screens (inbox, thread in sales mode, students,
 * schedule, teachers, subscriptions, earnings) run here as they do for an admin holding the double
 * role, with their links moved under /sales (TreeBaseProvider). Push (and the bell) only with notifications.push.
 */
export function SalesTabs() {
  usePushRegistration('sales');
  const can = usePermissions();
  const badge = useInboxBadge(can);
  return (
    <TreeBaseProvider value="/sales">
      <AppNativeTabs tabs={salesTabItems(can, badge)} />
    </TreeBaseProvider>
  );
}
