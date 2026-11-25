import { counted, type PluralForm } from '@ab/core';
import type { LessonRoomState, RoomPresence, RoomPresenceRole } from '@ab/schedule';
import { roomLiveMinutes } from '../../../../teaching/lesson-room';

// Live state comes from LiveKit participant events; a lesson ended for everyone is never live.

export interface LiveRoom {
  /** Whole minutes since the first of those inside arrived. */
  minutes: number;
  /** The teacher is inside now. */
  teacherIn: boolean;
  people: readonly RoomPresence[];
}

/** The live room of a lesson, else null (nobody inside, ended, or an API without `room`). */
export function liveRoom(lesson: { room?: LessonRoomState | null }, now: Date): LiveRoom | null {
  const minutes = roomLiveMinutes(lesson.room, now);
  const people = lesson.room?.inRoom ?? [];
  if (minutes === null) return null;
  return { minutes, teacherIn: people.some((p) => p.role === 'teacher'), people };
}

/**
 * What the lesson card says about the room: ended for everyone (`room.endedAt`, no way back in),
 * live (someone inside), or nothing (the clock states only).
 */
export type CardRoom =
  | { kind: 'ended'; endedAt: string }
  | { kind: 'live'; live: LiveRoom }
  | { kind: 'none' };

const NO_ROOM: CardRoom = { kind: 'none' };

export function cardRoom(lesson: { room?: LessonRoomState | null }, now: Date): CardRoom {
  const endedAt = lesson.room?.endedAt;
  if (typeof endedAt === 'string') return { kind: 'ended', endedAt };
  const live = liveRoom(lesson, now);
  return live ? { kind: 'live', live } : NO_ROOM;
}

/** Each app's `t.portal.app.live` (the same keys in ar.json / en.json). */
export interface LiveRoomWords {
  justNow: string;
  /** One string per Arabic plural form. */
  since: Readonly<Record<PluralForm, string>>;
  teacherIn: string;
  othersIn: string;
  roles: Readonly<Record<RoomPresenceRole, string>>;
  /** People the portal names by role only, for privacy. */
  unnamed: Readonly<Record<RoomPresenceRole, string>>;
  row: string;
  rowTeacher: string;
}

export interface LiveRoomText {
  since: string;
  /** Over the names: the teacher is in, or only others. */
  title: string;
  who: string;
  /** Each person's avatar name, in order: their name, else their role word. */
  faces: string[];
  row: string;
}

/** The card's and the row's words for a live room. */
export function liveRoomText(live: LiveRoom, words: LiveRoomWords): LiveRoomText {
  // The portal names only the teacher and the family's own students; others come by role.
  const name = (p: RoomPresence): string =>
    p.name === undefined ? words.unnamed[p.role] : words.roles[p.role].split('{name}').join(p.name);
  return {
    since: live.minutes < 1 ? words.justNow : counted(words.since, live.minutes),
    title: live.teacherIn ? words.teacherIn : words.othersIn,
    who: live.people.map(name).join(' · '),
    faces: live.people.map((p) => p.name ?? words.unnamed[p.role]),
    row: live.teacherIn ? words.rowTeacher : words.row,
  };
}
