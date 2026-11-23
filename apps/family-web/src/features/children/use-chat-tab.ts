import { useQuery } from '@tanstack/react-query';
import { portalUnreadQuery, useFamilyChatOn } from '@ab/web-kit/portal';
import type { ChatTab } from './child-tabs';

/**
 * «المحادثة» of one child (docs/50 §6): on while settings.family_chat_enabled is (off while the
 * settings load or fail), with its unread count; off reads no channel at all. A read in the
 * thread refreshes the count (the kit's channelCountKeys).
 */
export function useChatTab(studentId: string): ChatTab {
  const on = useFamilyChatOn();
  const { data } = useQuery({ ...portalUnreadQuery(studentId), enabled: on });
  return { on, unread: data?.unread ?? 0 };
}
