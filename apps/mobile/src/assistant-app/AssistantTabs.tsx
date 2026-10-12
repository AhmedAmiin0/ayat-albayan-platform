import { usePermissions } from '@/auth/use-permissions';
import { TreeBaseProvider } from '@/nav/tree-base';
import { usePushWhenHeld } from '@/push/usePushWhenHeld';
import { AppNativeTabs } from '@/ui/AppNativeTabs';
import { assistantTabItems } from './assistant-tabs';

/**
 * The phone app of the classroom assistant («مساعد حلقة», owner 2026-10-12): its own tree under
 * /assistant, mirroring the web /assistant/ page. Push only with notifications.push.
 */
export function AssistantTabs() {
  usePushWhenHeld();
  const can = usePermissions();
  return (
    <TreeBaseProvider value="/assistant">
      <AppNativeTabs tabs={assistantTabItems(can)} />
    </TreeBaseProvider>
  );
}
