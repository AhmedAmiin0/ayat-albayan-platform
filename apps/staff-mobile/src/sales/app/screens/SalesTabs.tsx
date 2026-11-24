import { usePermissions, AppNativeTabs } from '@ab/mobile-kit';
import { canOpen } from '@/core/auth';
import { useInboxBadge } from '@/core/nav/use-inbox-badge';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { useInboxRealtime } from '@/inbox';
import { salesTabItems } from '@/sales/app/lib/sales-tabs';

/** The sales role's own tree under /sales; push only with notifications.push (docs/12 §15). */
export function SalesTabs() {
  usePushRegistration('sales');
  const can = usePermissions();
  const badge = useInboxBadge(can);
  useInboxRealtime(canOpen(can, 'inbox'));
  return (
    <TreeBaseProvider value="/sales">
      <AppNativeTabs tabs={salesTabItems(can, badge)} />
    </TreeBaseProvider>
  );
}
