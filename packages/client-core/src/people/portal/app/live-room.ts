import {
  counted,
  type LessonRoomState,
  type PluralForm,
  type RoomPresence,
  type RoomPresenceRole,
} from '@ab/shared';
import { roomLiveMinutes } from '../../../teaching/lesson-room/index.js';

// «الحلقة جارية الآن» on the family's lesson card and schedule row (owner 2026-11-16, canvas
// RoomXLiveHome, RoomXLivePush): from the lesson's `room` (LiveKit participant_joined / left),
// how long it has run and who is inside. A lesson ended for everyone is never live.

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

/** Each app's `t.portal.app.live` (the same keys in ar.json / en.json). */
export interface LiveRoomWords {
  /** «بدأت الآن». */
  justNow: string;
  /** «بدأت منذ {n} دقائق», one per Arabic count form. */
  since: Readonly<Record<PluralForm, string>>;
  /** «المعلم/ة في الغرفة الآن». */
  teacherIn: string;
  /** «في الغرفة الآن». */
  othersIn: string;
  /** How a person is named by role: «{name}», «{name} (مساعد حلقة)». */
  roles: Readonly<Record<RoomPresenceRole, string>>;
  /** The schedule row: «جارية الآن». */
  row: string;
  /** The schedule row with the teacher in: «جارية الآن · المعلم/ة في الغرفة». */
  rowTeacher: string;
}

export interface LiveRoomText {
  since: string;
  /** Over the names: the teacher is in, or only others. */
  title: string;
  /** «فاطمة · مريم (مساعد حلقة)». */
  who: string;
  row: string;
}

/** The card's and the row's words for a live room. */
export function liveRoomText(live: LiveRoom, words: LiveRoomWords): LiveRoomText {
  const name = (p: RoomPresence): string => words.roles[p.role].split('{name}').join(p.name);
  return {
    since: live.minutes < 1 ? words.justNow : counted(words.since, live.minutes),
    title: live.teacherIn ? words.teacherIn : words.othersIn,
    who: live.people.map(name).join(' · '),
    row: live.teacherIn ? words.rowTeacher : words.row,
  };
}
