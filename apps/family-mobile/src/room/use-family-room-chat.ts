import { familyChatOn } from '@ab/client-core';
import { router } from 'expo-router';
import type { RoomChat } from '@ab/mobile-kit/room';
import { usePublicConfig } from '@ab/mobile-kit';
import { useChildUnread } from '#/portal/index.ts';
import { roomChatHref } from './room-way';

/**
 * The in-room «المحادثة» of the family (owner 2026-11-16, canvas RoomXChat): THE student channel,
 * as a sheet over the live room, with its unread count; on a trial lesson it explains that the chat
 * opens after subscribing. None while settings.family_chat_enabled is off.
 */
export function useFamilyRoomChat(studentId: string): RoomChat | null {
  const chatOn = familyChatOn(usePublicConfig());
  const unread = useChildUnread(studentId, chatOn).data?.unread ?? 0;
  if (!chatOn) return null;
  return { unread, open: () => router.push(roomChatHref(studentId)), whenLocked: 'explain' };
}
