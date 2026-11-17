import {
  isRoomLive,
  minutesLeft,
  roomLiveMinutes,
  studentWaiting,
  teacherLessonState,
  type TeacherLessonState,
} from '@ab/client-core';
import { counted, type Glyph, type LessonView, type RoomPresence, type Tone } from '@ab/shared';
import { t } from '@ab/mobile-kit';

// The teacher's own word for a lesson (docs/48 «State word lookup»): one per state, the same on
// the «اليوم» rows, the hero chip and «جدولي». Each chip shows the nuqta AND the word (docs/07).

interface TeacherWord {
  label: string;
  tone: Tone;
  glyph: Glyph;
}

type WordLesson = Parameters<typeof teacherLessonState>[0] & Pick<LessonView, 'students' | 'room'>;
/** `status` and `done` leave the word to the lesson-status chip. */
type Worded = Exclude<TeacherLessonState, 'status' | 'done'>;

/** A window not yet closed: a group's closed ones must not count down to the past. */
const stillOpen = (now: Date) => (iso: string) => Date.parse(iso) > now.getTime();

/** The soonest family send among the lesson's submitted reports still in their edit window. */
const soonestClose = (lesson: WordLesson, now: Date): string | undefined =>
  lesson.students
    .flatMap((s) => (s.report?.edit_until ? [s.report.edit_until] : []))
    .filter(stillOpen(now))
    .sort()
    .at(0);

/** «سيُرسل إلى الأسرة بعد 12 دقيقة», counted to edit_until (docs/46 B5). */
const sendsIn = (lesson: WordLesson, now: Date): string =>
  t.reports.familySend.sendsIn.replace(
    '{when}',
    counted(t.settingsValues.units.minutes, minutesLeft(soonestClose(lesson, now), now)),
  );

const WORDS: Record<Worded, (lesson: WordLesson, now: Date) => TeacherWord> = {
  awaiting: () => ({ label: t.teacherToday.awaiting, tone: 'act', glyph: 'hollow' }),
  confirmed: () => ({ label: t.teacherBoard.confirmedChip, tone: 'ok', glyph: 'fill' }),
  running: () => ({ label: t.today.running, tone: 'ok', glyph: 'fill' }),
  write: () => ({ label: t.reports.open, tone: 'act', glyph: 'hollow' }),
  resume: () => ({ label: t.reports.resume, tone: 'act', glyph: 'half' }),
  window: (lesson, now) => ({ label: sendsIn(lesson, now), tone: 'neutral', glyph: 'half' }),
};

const isWorded = (state: TeacherLessonState): state is Worded =>
  state !== 'status' && state !== 'done';

/**
 * The room's own word first (owner 2026-11-16, canvas RoomXTeacherToday): «الطالب ينتظرك» while the
 * family waits inside without her, «الحلقة جارية الآن» while she is in.
 */
function roomWord(lesson: Pick<LessonView, 'room'>): TeacherWord | null {
  if (studentWaiting(lesson.room)) {
    return { label: t.teacherToday.waiting, tone: 'act', glyph: 'fill' };
  }
  return isRoomLive(lesson.room)
    ? { label: t.teacherToday.liveNow, tone: 'ok', glyph: 'fill' }
    : null;
}

/** Her word for the lesson now, or null: then the lesson-status chip speaks (held, excused…). */
export function teacherWord(lesson: WordLesson, now: Date): TeacherWord | null {
  const state = teacherLessonState(lesson, now);
  return roomWord(lesson) ?? (isWorded(state) ? WORDS[state](lesson, now) : null);
}

export interface Waiting {
  name: string;
  /** «يوسف ينتظرك في الغرفة». */
  line: string;
  /** «دخل منذ 3 دقائق». */
  since: string;
}

type FamilyPresence = RoomPresence & { role: 'student' | 'guardian' };
const isFamily = (p: RoomPresence): p is FamilyPresence =>
  p.role === 'student' || p.role === 'guardian';

/** The family member waiting inside without her, by name (a name kept back reads as the role). */
function waiterName(room: LessonView['room']): string | null {
  const who = studentWaiting(room) ? room?.inRoom.find(isFamily) : undefined;
  return who ? (who.name ?? t.studentChannel.roles[who.role]) : null;
}

/** Who waits for her in the room and since when (the hero's strip); null when nobody does. */
export function waiting(lesson: Pick<LessonView, 'room'>, now: Date): Waiting | null {
  const minutes = roomLiveMinutes(lesson.room, now);
  const name = waiterName(lesson.room);
  if (name === null || minutes === null) return null;
  const age = minutes < 1 ? t.mobile.age.now : counted(t.mobile.age.minutes, minutes);
  return {
    name,
    line: t.teacherToday.waitingLine.replace('{name}', name),
    since: t.teacherToday.waitingSince.replace('{age}', age),
  };
}
