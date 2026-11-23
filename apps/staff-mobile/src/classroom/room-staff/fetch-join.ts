import { roomJoinResultSchema } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { credentialsOf, type RoomCredentials, type RoomTarget } from '@ab/mobile-kit/room';
import { joinPath } from './join-target';
import { apiSend } from '@ab/mobile-kit';

const post: (method: 'POST', path: string) => Promise<unknown> = apiSend;

/**
 * POST the room's join endpoint (the web room's own); a refusal throws the ApiError with its code
 * (410 lesson_ended: ended for everyone). The answer is checked where the token is used.
 */
export const sendJoin = (target: RoomTarget): Promise<unknown> => post('POST', joinPath(target));

/** The join answer, checked at the boundary (the room needs its token and role). */
export const joinAnswer = (answer: unknown): RoomJoinResult => roomJoinResultSchema.parse(answer);

/** The join again from inside the room (a retry, or no token handed over by the press). */
export async function fetchJoin(target: RoomTarget): Promise<RoomCredentials> {
  return credentialsOf(joinAnswer(await sendJoin(target)));
}
