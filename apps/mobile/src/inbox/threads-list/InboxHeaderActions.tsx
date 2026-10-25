import { View } from 'react-native';
import type { TreeBase } from '@/core/nav/tree-base';
import { HeldBell } from '@/notifications/HeldBell';
import { NewChatSheet } from './NewChatSheet';

export interface InboxHeaderActionsProps {
  base: TreeBase;
}

/**
 * The inline-end of the «المحادثات» header: «محادثة جديدة» for the admin and sales chats; in the
 * sales tree (its home) the bell beside it too, as the admin's and teacher's Today (shown only with
 * notifications.push). A teacher's chats get the default mark.
 */
export function InboxHeaderActions({ base }: InboxHeaderActionsProps) {
  if (base !== '/sales') return <NewChatSheet />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <HeldBell tree="sales" />
      <NewChatSheet />
    </View>
  );
}
