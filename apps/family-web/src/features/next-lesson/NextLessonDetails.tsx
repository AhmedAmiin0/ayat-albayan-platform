import { cardRoom, type CardRoom } from '@ab/client-core';
import type { PortalLesson, PortalStudent, RoomJoinResult } from '@ab/shared';
import { useState } from 'react';
import {
  RoomOverlay,
  LessonAction,
  LessonCountdown,
  LessonWhen,
  CardRoomLine,
} from '@ab/web-kit/portal';
import { Dot, StatusMark } from '@ab/web-kit/ui';
import { t, teacherLabel } from '@ab/web-kit/i18n';
import { useLessonStatusText } from '@ab/web-kit/settings';

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** Its join window is open now: the live mark and «ادخل الحلقة». */
  open: boolean;
  /** «الرئيسية»: the live countdown, and the hint until the window opens. */
  full?: boolean;
}

type Shown = Pick<Props, 'lesson' | 'now' | 'open'> & { full: boolean };

/** Before anyone is inside: the countdown («الرئيسية») and «الدخول متاح الآن» once it opens. */
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

/** «ادخل الآن» while the room is live, «ادخل الحلقة» before. */
const joinLabel = (kind: CardRoom['kind']): string | undefined =>
  kind === 'live' ? t.portal.app.live.join : undefined;

/**
 * The next lesson's lines: when (family and viewer clocks) with its status, the teacher, the
 * countdown («الرئيسية»; its digits change in place, never animate), «الدخول متاح الآن» popping in
 * once the window opens, and «ادخل الحلقة»; the live room (since when, who is inside, «ادخل
 * الآن») or «انتهت الحلقة» once it was ended for everyone. Once admitted, the room covers the page.
 */
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
