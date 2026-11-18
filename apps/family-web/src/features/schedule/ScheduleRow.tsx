import { lessonMinutes, lessonWait, type WeekLesson } from '@ab/client-core';
import { clockOf, type RoomJoinResult } from '@ab/shared';
import { useState } from 'react';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { useClock } from '@ab/web-kit/lib/clock';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { cn } from '@ab/web-kit/lib/utils';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { LessonAction } from '@ab/web-kit/portal/lessons/LessonAction';

/** The join button lights up by itself at the window (canvas Schedule «ادخل»). */
const TICK_MS = 1_000;

const OPEN = 'border-gold bg-gold-wash shadow-fam-lift';
const CLOSED = 'border-rule border-e-4 border-e-[var(--fam-edge-green)] bg-raised shadow-fam-card';

/** The join button fills a narrow day tile and may wrap. */
const FIT = '[&_a]:w-full [&_a]:px-3 [&_button]:w-full [&_button]:px-3 [&_button]:whitespace-normal';

/** «الدخول متاح الآن» over an open lesson (boards: the live card's chip). */
function OpenChip() {
  return (
    <span className="inline-flex min-h-7 w-fit items-center gap-1.5 rounded-full border
      border-fam-mint-rule bg-fam-mint px-2.5 text-xs font-bold text-fam-mint-ink">
      <span aria-hidden="true" className="size-2 rounded-full bg-[var(--fam-edge-green)]" />
      {t.portal.app.lesson.openNow}
    </span>
  );
}

/**
 * One lesson of the week on the viewer's clock (the days above are theirs too): the time span,
 * the teacher, the length, and «ادخل الحلقة» once the window opens — the room opens over the page
 * (a Meet lesson opens its link).
 */
export function ScheduleRow({ entry }: { entry: WeekLesson }) {
  const { lesson, student } = entry;
  const now = useNow(TICK_MS);
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const open = lessonWait(lesson, now) === null;
  if (room) {
    return (
      <li className="fixed inset-0 z-50 overflow-auto bg-page">
        <ClassroomRoom join={room} onRejoin={() => setRoom(null)} />
      </li>
    );
  }
  const span = t.familyLook.pages.schedule.range
    .replace('{from}', clockOf(new Date(lesson.starts_at), clock))
    .replace('{to}', clockOf(new Date(lesson.ends_at), clock));
  return (
    <li className={cn('grid min-w-0 gap-1.5 rounded-2xl border p-3', open ? OPEN : CLOSED)}>
      {open && <OpenChip />}
      <p className="text-body font-extrabold text-ink tabular-nums">{span}</p>
      <p className="text-xs text-ink-3">
        {t.portal.app.lesson.teacher.replace('{name}', teacherLabel(lesson.teacher))}
      </p>
      <p className="text-xs text-ink-3">
        {t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)))}
      </p>
      {open && (
        <div className={FIT}>
          <LessonAction lesson={lesson} studentId={student.id} tz={tz} now={now}
            onJoined={setRoom} />
        </div>
      )}
    </li>
  );
}
