import type { PortalStudent } from '@ab/shared';
import { chatOpen, type RoomJoinResult } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import type { RoomChatSlot } from '@ab/web-kit/classroom/flow/room-kit';
import { ChannelThread } from '@ab/web-kit/components/channel/ChannelThread';
import { portalUnreadQuery } from '@ab/web-kit/portal/api';
import { useFamilyChatOn } from '@ab/web-kit/portal/use-family-chat';

/** The unread count's query: asked only while counted and for a known student. */
const unreadOf = (student: PortalStudent | null, counted: boolean) => ({
  ...portalUnreadQuery(student?.id ?? ''),
  enabled: counted && student !== null,
});

/** The in-room chat is the student channel; a trial room explains it opens after subscribing. */
export function useRoomChat(
  student: PortalStudent | null,
  join: RoomJoinResult,
): RoomChatSlot | null {
  const chatOn = useFamilyChatOn();
  const locked = !chatOpen(join);
  const counted = chatOn && !locked;
  const unread = useQuery(unreadOf(student, counted));
  if (!chatOn || student === null) return null;
  return {
    unread: unread.data?.unread ?? 0,
    locked,
    body: <ChannelThread refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />,
  };
}
