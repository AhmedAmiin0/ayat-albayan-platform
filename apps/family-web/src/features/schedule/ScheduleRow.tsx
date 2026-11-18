import { dayWord, lessonMinutes, lessonWait, type WeekLesson } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/shared';
import { useState } from 'react';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { LessonAction } from '@ab/web-kit/portal/lessons/LessonAction';
import { LessonWhen } from '@ab/web-kit/portal/lessons/LessonWhen';

/** The join button lights up by itself at the window (canvas Schedule «ادخل»). */
const TICK_MS = 1_000;

/**
 * One lesson of the week on the viewer's clock (the days above are theirs too): the teacher, the
 * length, and «ادخل الحلقة» once the window opens — the room opens over the page (a Meet lesson
 * opens its link).
 */
export function ScheduleRow({ entry }: { entry: WeekLesson }) {
  const { lesson, student } = entry;
  const now = useNow(TICK_MS);
  const tz = useViewerTz();
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const word = dayWord(new Date(lesson.starts_at), now, tz);
  if (room) {
    return (
      <li className="fixed inset-0 z-50 overflow-auto bg-page">
        <ClassroomRoom join={room} onRejoin={() => setRoom(null)} />
      </li>
    );
  }
  return (
    <li className="grid gap-2 rounded-lg border border-rule bg-raised p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LessonWhen startsAt={lesson.starts_at} tz={tz} />
        {word && (
          <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-semibold">
            {t.portal.app.lesson[word]}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-2">
        {t.portal.app.lesson.teacher.replace('{name}', teacherLabel(lesson.teacher))}
        {' · '}
        {t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)))}
      </p>
      {lessonWait(lesson, now) === null && (
        <LessonAction lesson={lesson} studentId={student.id} tz={tz} now={now} onJoined={setRoom} />
      )}
    </li>
  );
}
