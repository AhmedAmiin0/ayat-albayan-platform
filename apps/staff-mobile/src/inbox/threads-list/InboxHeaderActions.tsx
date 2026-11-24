import { View } from 'react-native';
import type { TreeBase } from '@/core/nav/tree-base';
import { LiveDot } from '@/inbox/thread/live';
import { HeldBell } from '@/notifications/HeldBell';

interface InboxHeaderActionsProps {
  base: TreeBase;
}

/** docs/44 K2; a teacher never joins the realtime channel, so teacher chats get neither. */
export function InboxHeaderActions({ base }: InboxHeaderActionsProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <LiveDot />
      {base === '/sales' ? <HeldBell tree="sales" /> : null}
    </View>
  );
}
