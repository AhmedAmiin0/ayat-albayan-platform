import { lessonJoinCalls, meetingCalls } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { credentialsOf, type RoomCredentials, type RoomKind, type RoomTarget } from '@ab/mobile-kit/room';
import { apiFetch, apiSend } from '@ab/mobile-kit';

const lessons = lessonJoinCalls({ apiFetch, apiSend });
const meetings = meetingCalls({ apiFetch, apiSend });

/** The web room's own join routes; each answer is parsed, as the room needs its token and role. */
const JOIN_BY_KIND: Record<RoomKind, (id: string) => Promise<RoomJoinResult>> = {
  lesson: lessons.join,
  meeting: meetings.join,
};

/** A refusal throws the ApiError with its code (410 lesson_ended: ended for everyone). */
export const sendJoin = (target: RoomTarget): Promise<RoomJoinResult> =>
  JOIN_BY_KIND[target.kind](target.id);

/** The join again from inside the room (a retry, or no token handed over by the press). */
export async function fetchJoin(target: RoomTarget): Promise<RoomCredentials> {
  return credentialsOf(await sendJoin(target));
}
