import { View } from 'react-native';
import type { TreeBase } from '@/core/nav/tree-base';
import { LiveDot } from '@/inbox/thread/live';
import { HeldBell } from '@/notifications/HeldBell';

interface InboxHeaderActionsProps {
  base: TreeBase;
}

/**
 * The inline-end of the «المحادثات» header (admin and sales): the realtime dot (docs/44 K2), then in
 * the sales tree (its home) the bell, as the admin's and teacher's Today (shown only with
 * notifications.push). «محادثة جديدة» floats over the list instead (NewChatSheet, owner
 * 2026-10-27). A teacher's chats get neither: a teacher never joins the channel.
 */
export function InboxHeaderActions({ base }: InboxHeaderActionsProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <LiveDot />
      {base === '/sales' ? <HeldBell tree="sales" /> : null}
    </View>
  );
}
