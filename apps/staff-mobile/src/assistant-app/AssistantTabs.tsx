import { usePermissions, AppNativeTabs } from '@ab/mobile-kit';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { assistantTabItems } from './assistant-tabs';

/**
 * The classroom assistant's phone app: its own tree under /assistant, mirroring the web
 * /assistant/ page. Push (and the bell) only with notifications.push.
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
