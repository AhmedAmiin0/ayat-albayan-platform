import { liveRoom } from '@ab/client-core';
import { lessonWhenAt, type PortalLesson, type PortalStudent } from '@ab/shared';
import type { RoomContext } from '#/classroom/index.ts';
import { useClock } from '#/lib/index.ts';
import { t, teacherLabel } from '#/lib/i18n/index.ts';
import { useNow } from '#/lib/time/index.ts';
import { LessonCountdown } from '#/portal/lessons/LessonCountdown.tsx';
import { LivePresence } from './LivePresence';

/** The countdown under «بانتظار المعلم/ة…» ticks once a second, like the card's. */
const TICK_MS = 1_000;

/** «تبدأ الحلقة بعد 00:03:30» (or «الحلقة جارية الآن») while waiting in the room. */
function RoomCountdown({ lesson }: { lesson: PortalLesson }) {
  return <LessonCountdown lesson={lesson} now={useNow(TICK_MS)} />;
}

/** Who is inside, from the lesson's `room` (the list reloads every 30 s), while it is live. */
function RoomPresence({ lesson }: { lesson: PortalLesson }) {
  const live = liveRoom(lesson, useNow(TICK_MS));
  return live && <LivePresence live={live} />;
}

export interface RoomLesson {
  lesson: PortalLesson;
  student: PortalStudent;
}

/**
 * The room's top line and notes from the card that opened it: «حلقة يوسف مع أ. فاطمة» on the
 * family's clock, the countdown while waiting, and who is inside (device check, «خرجت»).
 */
export function useRoomContext(about: RoomLesson | null): RoomContext | undefined {
  const clock = useClock();
  if (!about) return undefined;
  const { lesson, student } = about;
  const title = t.roomFlow.title
    .replace('{student}', student.name)
    .replace('{teacher}', teacherLabel(lesson.teacher));
  return {
    title,
    subtitle: lessonWhenAt(new Date(lesson.starts_at), { tz: student.tz, ...clock }),
    waiting: <RoomCountdown lesson={lesson} />,
    presence: <RoomPresence lesson={lesson} />,
  };
}
