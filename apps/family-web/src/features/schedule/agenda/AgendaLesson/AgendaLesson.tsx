import { lessonMinutes, lessonWait, type WeekLesson } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { clockOf } from '@ab/time';
import { useState } from 'react';
import {
  Card,
  Dot,
  useClock,
  teacherLabel,
  t,
  useNow,
  useViewerTz,
  LessonAction,
  LessonOptionsBar,
  FamilyChip,
} from '@ab/web-kit';
import { RoomOverlay } from '@ab/web-kit/room';

/** The join button lights up by itself when the window opens. */
const TICK_MS = 1_000;
const L = t.portal.app.lesson;

interface AgendaLessonProps {
  entry: WeekLesson;
  /** Only a guardian answers for the lesson; a student only reads it. */
  guardian: boolean;
}

/** Times are on the viewer's clock; only a guardian gets the attendance answer actions. */
export function AgendaLesson({ entry, guardian }: AgendaLessonProps) {
  const { lesson, student } = entry;
  const now = useNow(TICK_MS);
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const open = lessonWait(lesson, now) === null;
  const [from, to] = [lesson.starts_at, lesson.ends_at].map((at) => clockOf(new Date(at), clock));
  const range = `${from ?? ''} – ${to ?? ''}`;
  return (
    <Card asChild className="grid gap-2 p-3">
      <li>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body font-semibold tabular-nums">{range}</p>
          <FamilyChip lesson={lesson} />
        </div>
        <p className="text-sm text-ink-2">
          {L.teacher.replace('{name}', teacherLabel(lesson.teacher))}
          {' · '}
          {L.minutes.replace('{n}', String(lessonMinutes(lesson)))}
        </p>
        {open && <Dot tone="ok" live>{L.openNow}</Dot>}
        {open && (
          <LessonAction
            lesson={lesson}
            studentId={student.id}
            tz={tz}
            now={now}
            onJoined={setRoom}
          />
        )}
        {guardian && <LessonOptionsBar lesson={lesson} student={student} now={now} />}
        {room && <RoomOverlay join={room} onRejoin={() => setRoom(null)} />}
      </li>
    </Card>
  );
}
