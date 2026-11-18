import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { LessonActs } from './LessonActs';
import { LessonWhen } from './LessonWhen';
import { FamilyChip } from './options/FamilyChip';
import { WithRoom } from './WithRoom';

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
  return (
    <WithRoom>
      {(onJoined) => (
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
          <LessonActs lesson={lesson} student={student} now={now} onJoined={onJoined} />
        </div>
      )}
    </WithRoom>
  );
}
