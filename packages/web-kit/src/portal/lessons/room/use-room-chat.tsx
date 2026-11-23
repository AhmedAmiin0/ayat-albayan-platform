import { chatOpen, type PortalStudent, type RoomJoinResult } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { RoomChatSlot } from '#/classroom/index.ts';
import { ChannelThread } from '#/components/channel/index.ts';
import { portalUnreadQuery } from '#/portal/api.ts';
import { useFamilyChatOn } from '#/portal/use-family-chat.ts';

/** The unread count's query: asked only while counted and for a known student. */
const unreadOf = (student: PortalStudent | null, counted: boolean) => ({
  ...portalUnreadQuery(student?.id ?? ''),
  enabled: counted && student !== null,
});

/**
 * The family's in-room «المحادثة» (the app's use-family-room-chat, canvas RoomXChat): THE student
 * channel (the same thread as the child page's tab), with its unread count; a trial lesson's room
 * explains that the chat opens after subscribing (no badge). None while family_chat_enabled is off.
 */
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
