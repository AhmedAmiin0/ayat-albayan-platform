import { useQuery } from '@tanstack/react-query';
import { portalUnreadQuery, useFamilyChatOn } from '@ab/web-kit';
import type { ChatTab } from './child-tabs';

/** docs/50 §6: off while settings load or fail; off reads no channel at all. */
export function useChatTab(studentId: string): ChatTab {
  const on = useFamilyChatOn();
  const { data } = useQuery({ ...portalUnreadQuery(studentId), enabled: on });
  return { on, unread: data?.unread ?? 0 };
}
