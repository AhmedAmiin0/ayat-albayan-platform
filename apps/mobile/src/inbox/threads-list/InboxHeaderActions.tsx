import type { TreeBase } from '@/core/nav/tree-base';
import { HeldBell } from '@/notifications/HeldBell';

interface InboxHeaderActionsProps {
  base: TreeBase;
}

/**
 * The inline-end of the «المحادثات» header: in the sales tree (its home) the bell, as the admin's and
 * teacher's Today (shown only with notifications.push); nothing in the admin tree. «محادثة جديدة»
 * floats over the list instead (NewChatSheet, owner 2026-10-27). A teacher's chats get the default mark.
 */
export function InboxHeaderActions({ base }: InboxHeaderActionsProps) {
  return base === '/sales' ? <HeldBell tree="sales" /> : null;
}
