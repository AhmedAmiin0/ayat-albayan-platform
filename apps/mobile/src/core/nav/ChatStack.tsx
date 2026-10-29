import { FullScreenProvider } from '@/core/ui/layout/Screen';
import { TabStack } from './TabStack';
import { InChatProvider } from './tree-base';

/**
 * The stack of a chat group (app/(admin-chat), (sales-chat), (teacher-chat)): the chat and the screens
 * it opens (book, subscribe, sales-*, registration-check, the student file and its own screens), above the
 * tree's tabs, as in WhatsApp. No tab bar under it (react-native-screens#4132), so its screens own the
 * bottom safe area; the student screens link to the group's copies (useStudentHref), never to a tab.
 */
export function ChatStack() {
  return (
    <FullScreenProvider value>
      <InChatProvider>
        <TabStack />
      </InChatProvider>
    </FullScreenProvider>
  );
}
