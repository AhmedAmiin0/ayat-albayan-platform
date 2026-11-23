import { lessonMinutes, lessonWait, type WeekLesson } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { clockOf } from '@ab/time';
import { useState } from 'react';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { Dot } from '@ab/web-kit/components/ui/surface/pill';
import { useClock } from '@ab/web-kit/lib/clock';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { LessonAction } from '@ab/web-kit/portal/lessons/LessonAction';
import { LessonOptionsBar } from '@ab/web-kit/portal/lessons/options/LessonOptionsBar';
import { RoomOverlay } from '@ab/web-kit/portal/lessons/RoomOverlay';
import { FamilyChip } from '@ab/web-kit/portal/lessons/options/FamilyChip';

/** The join button lights up by itself at the window (canvas Schedule «ادخل»). */
const TICK_MS = 1_000;
const L = t.portal.app.lesson;

interface AgendaLessonProps {
  entry: WeekLesson;
  /** A guardian answers for the lesson («سأحضر» …); a student only reads it. */
  guardian: boolean;
}

/**
 * One lesson of the day on the viewer's clock: its time, the teacher and the length, its state;
 * «ادخل الحلقة» once the window opens (the room opens over the page, a Meet lesson its link); and
 * for a guardian «سأحضر» · «اطلب موعدًا آخر» · «أعتذر عن الحلقة».
 */
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
