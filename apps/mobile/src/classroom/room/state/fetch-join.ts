import type { RoomJoinResult } from '@ab/shared';
import { joinPath } from '@/classroom/room/model/join-target';
import type { RoomCredentials, RoomTarget } from '@/classroom/room/model/room-types';
import { apiSend } from '@/core/lib/http/api';

/**
 * POST the room's join endpoint (the web room's own); a refusal throws the ApiError with its code.
 */
export async function fetchJoin(target: RoomTarget): Promise<RoomCredentials> {
  const join = await apiSend<RoomJoinResult>('POST', joinPath(target));
  return { url: join.url, token: join.token };
}
