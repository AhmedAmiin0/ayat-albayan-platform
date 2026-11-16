import { roomJoinResultSchema } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/shared';
import { credentialsOf } from '@/classroom/room/model/join-handoff';
import { joinPath } from '@/classroom/room/model/join-target';
import type { RoomCredentials, RoomTarget } from '@/classroom/room/model/room-types';
import { apiSend } from '@ab/mobile-kit';

const post: (method: 'POST', path: string) => Promise<unknown> = apiSend;

/**
 * POST the room's join endpoint (the web room's own), its answer checked at the boundary; a
 * refusal throws the ApiError with its code (410 lesson_ended: ended for everyone).
 */
export const postJoin = async (target: RoomTarget): Promise<RoomJoinResult> =>
  roomJoinResultSchema.parse(await post('POST', joinPath(target)));

/** The join again from inside the room (a retry, or no token handed over by the press). */
export async function fetchJoin(target: RoomTarget): Promise<RoomCredentials> {
  return credentialsOf(await postJoin(target));
}
