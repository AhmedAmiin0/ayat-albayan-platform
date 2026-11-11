import { teacherConfirmed } from '@ab/client-core';
import {
  isClosedLesson,
  teacherAttendanceKind,
  type ClockCycle,
  type LessonView,
} from '@ab/shared';
import { router } from 'expo-router';
import { whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ATTENDANCE_STYLE } from '@/sales/sales';
import { reportFormHref } from '@/core/ui/lists/ReportRows';

const w = t.teacherBoard;

interface BoardLessonRowProps {
  lesson: LessonView;
  studentId: string;
  /** The board's clock: one `now`, one zone (docs/46 C1). */
  at: { now: Date; tz: string; cycle: ClockCycle };
}

type OwnStudent = LessonView['students'][number];

/**
 * The second line: the report's state once started («أُرسل» / «مسودة» / «لا تقرير بعد»), before
 * it «أكّدتَ حضورك» once she said so.
 */
function stateLine(
  lesson: LessonView,
  own: OwnStudent | undefined,
  started: boolean,
): string | undefined {
  const report = own?.report;
  if (!started) return teacherConfirmed(lesson) ? w.confirmedChip : undefined;
  return report ? t.enums.reportStatus[report.status] : w.noReport;
}

/**
 * One of the student's lessons in the window: day and time on her clock, the attendance chip once
 * it started (teacherAttendanceKind: an auto-held lesson with no report is «لم يُسجَّل»), the
 * lesson status before. A started open lesson opens its report form.
 */
export function BoardLessonRow({ lesson, studentId, at }: BoardLessonRowProps) {
  const started = Date.parse(lesson.starts_at) <= at.now.getTime();
  const own = lesson.students.find((s) => s.id === studentId);
  const kind = started ? teacherAttendanceKind(lesson.status, own?.attendance ?? null) : null;
  const opens = started && !isClosedLesson(lesson.status);
  return (
    <ListRow
      title={whenIn(new Date(lesson.starts_at), at.tz, at.cycle)}
      subtitle={stateLine(lesson, own, started)}
      trailing={
        kind ? (
          <StatusChip {...ATTENDANCE_STYLE[kind]} label={t.sales.student.kind[kind]} size="sm" />
        ) : (
          <LessonStatusChip status={lesson.status} size="sm" />
        )
      }
      onPress={opens ? () => router.push(reportFormHref(lesson.id)) : undefined}
    />
  );
}
