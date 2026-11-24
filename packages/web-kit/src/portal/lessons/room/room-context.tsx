import { liveRoom } from '@ab/client-core';
import { lessonWhenAt, type PortalLesson, type PortalStudent } from '@ab/shared';
import type { RoomContext } from '@ab/web-kit/classroom/flow/room-kit';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { LessonCountdown } from '@ab/web-kit/portal/lessons/LessonCountdown';
import { LivePresence } from './LivePresence';

/** Ticks once a second, like the card's. */
const TICK_MS = 1_000;

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

/** Context from the card that opened the room, on the family's clock. */
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
