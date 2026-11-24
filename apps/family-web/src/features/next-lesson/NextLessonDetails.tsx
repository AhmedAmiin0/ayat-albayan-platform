import { cardRoom, type CardRoom } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { RoomJoinResult } from '@ab/schedule';
import { useState } from 'react';
import { RoomOverlay } from '@ab/web-kit/portal/lessons/RoomOverlay';
import { Dot } from '@ab/web-kit/components/ui/surface/pill';
import { StatusMark } from '@ab/web-kit/components/ui/surface/status-mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { useLessonStatusText } from '@ab/web-kit/lib/settings/lesson-status-text';
import { LessonAction } from '@ab/web-kit/portal/lessons/LessonAction';
import { LessonCountdown } from '@ab/web-kit/portal/lessons/LessonCountdown';
import { LessonWhen } from '@ab/web-kit/portal/lessons/LessonWhen';
import { CardRoomLine } from '@ab/web-kit/portal/lessons/room/CardRoomLine';

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  open: boolean;
  full?: boolean;
}

type Shown = Pick<Props, 'lesson' | 'now' | 'open'> & { full: boolean };

function ClockLines({ lesson, now, open, full }: Shown) {
  return (
    <>
      {full && <LessonCountdown lesson={lesson} now={now} />}
      {open && (
        <Dot tone="ok" live>
          {t.portal.app.lesson.openNow}
        </Dot>
      )}
    </>
  );
}

const joinLabel = (kind: CardRoom['kind']): string | undefined =>
  kind === 'live' ? t.portal.app.live.join : undefined;

/** The countdown digits change in place and never animate; once admitted, the room covers it. */
export function NextLessonDetails({ lesson, student, now, open, full = false }: Props) {
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const chip = useLessonStatusText().chip(lesson.status);
  const state = cardRoom(lesson, now);
  const joinable = (full || open) && state.kind !== 'ended';
  const shown = { lesson, now, open, full };
  if (room) {
    return <RoomOverlay join={room} onRejoin={() => setRoom(null)} about={{ lesson, student }} />;
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LessonWhen startsAt={lesson.starts_at} tz={student.tz} />
        <StatusMark tone={chip.tone} label={chip.label} />
      </div>
      <p className="text-sm text-ink-2">
        {t.portal.app.lesson.teacher.replace('{name}', teacherLabel(lesson.teacher))}
      </p>
      {state.kind === 'none' && <ClockLines {...shown} />}
      <CardRoomLine room={state} tz={student.tz} />
      {joinable && (
        <LessonAction
          lesson={lesson}
          studentId={student.id}
          tz={student.tz}
          now={now}
          onJoined={setRoom}
          label={joinLabel(state.kind)}
          counted={full && state.kind === 'none'}
        />
      )}
    </div>
  );
}
