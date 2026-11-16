import { roomJoinResultSchema } from '@ab/client-core';
import { credentialsOf } from '@/classroom/room/model/join-handoff';
import { joinPath } from '@/classroom/room/model/join-target';
import type { RoomCredentials, RoomTarget } from '@/classroom/room/model/room-types';
import { apiSend } from '@ab/mobile-kit';

/**
 * POST the room's join endpoint (the web room's own), its answer checked at the boundary; a
 * refusal throws the ApiError with its code (410 lesson_ended: ended for everyone).
 */
export async function fetchJoin(target: RoomTarget): Promise<RoomCredentials> {
  const join = roomJoinResultSchema.parse(await apiSend<unknown>('POST', joinPath(target)));
  return credentialsOf(join);
}
