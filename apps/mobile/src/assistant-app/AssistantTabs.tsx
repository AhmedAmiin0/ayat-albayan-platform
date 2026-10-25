import { usePermissions } from '@/auth/use-permissions';
import { TreeBaseProvider } from '@/nav/tree-base';
import { usePushRegistration } from '@/push/usePushRegistration';
import { AppNativeTabs } from '@/core/ui/layout/AppNativeTabs';
import { assistantTabItems } from './assistant-tabs';

/**
 * The phone app of the classroom assistant («مساعد حلقة», owner 2026-10-12): its own tree under
 * /assistant, mirroring the web /assistant/ page. Push (and the bell) only with notifications.push.
 */
export function AssistantTabs() {
  usePushRegistration('assistant');
  const can = usePermissions();
  return (
    <TreeBaseProvider value="/assistant">
      <AppNativeTabs tabs={assistantTabItems(can)} />
    </TreeBaseProvider>
  );
}
