import { ChatStack } from '@/core/nav/ChatStack';
import { TreeBaseProvider } from '@/core/nav/tree-base';

/** The salesperson's chat above her tabs: its links and back fallbacks stay under /sales (as SalesTabs). */
export default function SalesChatLayout() {
  return (
    <TreeBaseProvider value="/sales">
      <ChatStack />
    </TreeBaseProvider>
  );
}
