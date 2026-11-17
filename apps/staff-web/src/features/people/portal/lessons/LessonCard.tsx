import type { PortalLesson, PortalStudent, RoomJoinResult } from '@ab/shared';
import { useState } from 'react';
import { ClassroomRoom } from '@/features/teaching/classroom';
import { useNow } from '@/lib/time/use-now';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { LessonAction } from './LessonAction';
import { LessonCountdown } from './LessonCountdown';
import { LessonWhen } from './LessonWhen';
import { FamilyChip } from './options/FamilyChip';
import { FamilyLine } from './options/FamilyLine';
import { LessonOptionsBar } from './options/LessonOptionsBar';

/** The countdown ticks every second; the join button turns on by itself at the window. */
const TICK_MS = 1_000;

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
}

/**
 * One upcoming lesson: when (family and viewer clocks), status, teacher, what the family asked,
 * the live countdown, «ادخل الحلقة» and «خيارات الحلقة» (owner 2026-11-17). Once admitted, the
 * classroom covers the page (as on the student's own link).
 */
export function LessonCard({ lesson, student }: Props) {
  const now = useNow(TICK_MS);
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  if (room) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-page">
        <ClassroomRoom join={room} onRejoin={() => setRoom(null)} />
      </div>
    );
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
      <FamilyLine lesson={lesson} tz={student.tz} />
      <LessonCountdown lesson={lesson} now={now} />
      <LessonAction
        lesson={lesson}
        studentId={student.id}
        tz={student.tz}
        now={now}
        onJoined={setRoom}
      />
      <LessonOptionsBar lesson={lesson} student={student} now={now} />
    </div>
  );
}
