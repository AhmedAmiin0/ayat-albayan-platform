import type { PortalLesson, PortalStudent, RoomJoinResult } from '@ab/shared';
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

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** Its join window is open now: the live mark and «ادخل الحلقة». */
  open: boolean;
  /** «الرئيسية»: the live countdown, and the hint until the window opens. */
  full?: boolean;
}

/**
 * The next lesson's lines: when (family and viewer clocks) with its status, the teacher, the
 * countdown («الرئيسية»; its digits change in place, never animate), «الدخول متاح الآن» popping in
 * once the window opens, and «ادخل الحلقة». Once admitted, the classroom covers the page.
 */
export function NextLessonDetails({ lesson, student, now, open, full = false }: Props) {
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const chip = useLessonStatusText().chip(lesson.status);
  if (room) {
    return <RoomOverlay join={room} onRejoin={() => setRoom(null)} />;
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
      {full && <LessonCountdown lesson={lesson} now={now} />}
      {open && (
        <Dot tone="ok" live>
          {t.portal.app.lesson.openNow}
        </Dot>
      )}
      {(full || open) && (
        <LessonAction
          lesson={lesson}
          studentId={student.id}
          tz={student.tz}
          now={now}
          onJoined={setRoom}
        />
      )}
    </div>
  );
}
