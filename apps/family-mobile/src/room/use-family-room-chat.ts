import { familyChatOn } from '@ab/client-core';
import { router } from 'expo-router';
import type { RoomChat } from '@ab/mobile-kit/room';
import { usePublicConfig } from '@ab/mobile-kit';
import { useChildUnread } from '@/portal';
import { roomChatHref } from './room-way';

/** On a trial lesson it says chat opens after subscribing; none while family chat is off. */
export function useFamilyRoomChat(studentId: string): RoomChat | null {
  const chatOn = familyChatOn(usePublicConfig());
  const unread = useChildUnread(studentId, chatOn).data?.unread ?? 0;
  if (!chatOn) return null;
  return { unread, open: () => router.push(roomChatHref(studentId)), whenLocked: 'explain' };
}
