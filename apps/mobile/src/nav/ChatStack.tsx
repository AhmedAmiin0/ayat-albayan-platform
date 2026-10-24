import { FullScreenProvider } from '@/ui/Screen';
import { TabStack } from './TabStack';

/**
 * The stack of a chat group (app/(admin-chat), (sales-chat), (teacher-chat)): the chat and the screens
 * it opens (book, subscribe, sales-*, registration-check), above the tree's tabs, as in WhatsApp. No
 * tab bar under it (react-native-screens#4132), so its screens own the bottom safe area.
 */
export function ChatStack() {
  return (
    <FullScreenProvider value>
      <TabStack />
    </FullScreenProvider>
  );
}
