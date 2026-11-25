import { cardRoom } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { RoomJoinResult } from '@ab/schedule';
import { useState } from 'react';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { LessonAction } from './LessonAction';
import { LessonCountdown } from './LessonCountdown';
import { LessonWhen } from './LessonWhen';
import { RoomOverlay } from './RoomOverlay';
import { CardRoomLine } from './room/CardRoomLine';
import { FamilyChip } from './options/FamilyChip';
import { FamilyLine } from './options/FamilyLine';
import { LessonOptionsBar } from './options/LessonOptionsBar';

/** The countdown ticks every second; the join button turns on by itself at the window. */
const TICK_MS = 1_000;

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
}

/** Once admitted, the classroom covers the page. */
export function LessonCard({ lesson, student }: Props) {
  const now = useNow(TICK_MS);
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const state = cardRoom(lesson, now);
  if (room) {
    return <RoomOverlay join={room} onRejoin={() => setRoom(null)} about={{ lesson, student }} />;
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LessonWhen startsAt={lesson.starts_at} tz={student.tz} />
        <FamilyChip lesson={lesson} />
      </div>
      {lesson.teacher.display_name_ar && (
        <p className="text-sm text-ink-2">
          {t.portal.withTeacher.replace('{teacher}', teacherLabel(lesson.teacher))}
        </p>
      )}
      <FamilyLine lesson={lesson} student={student} now={now} />
      {state.kind === 'none' && <LessonCountdown lesson={lesson} now={now} />}
      <CardRoomLine room={state} tz={student.tz} />
      {state.kind !== 'ended' && (
        <LessonAction
          lesson={lesson}
          studentId={student.id}
          tz={student.tz}
          now={now}
          onJoined={setRoom}
          label={state.kind === 'live' ? t.portal.app.live.join : undefined}
          counted={state.kind === 'none'}
        />
      )}
      <LessonOptionsBar lesson={lesson} student={student} now={now} />
    </div>
  );
}
