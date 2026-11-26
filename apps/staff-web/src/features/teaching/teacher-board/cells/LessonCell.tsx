import { lessonWhenAt, teacherAttendanceKind } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { StatusChip, useClock, t } from '@ab/web-kit';
import { attendanceChip } from './attendance-style';

export interface LessonCellProps {
  lesson: LessonView | null;
  /** Her zone: the one zone of the board. */
  tz: string;
  studentId?: string;
}

const kindOf = (lesson: LessonView, studentId: string) =>
  teacherAttendanceKind(
    lesson.status,
    lesson.students.find((s) => s.id === studentId)?.attendance ?? null,
  );

/** A lesson's day and time on her clock, with the student's attendance chip for a past one. */
export function LessonCell({ lesson, tz, studentId }: LessonCellProps) {
  const clock = useClock();
  if (!lesson) return <span className="text-ink-3">{t.teacherBoard.none}</span>;
  const kind = studentId === undefined ? null : kindOf(lesson, studentId);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="tabular-nums">{lessonWhenAt(new Date(lesson.starts_at), { tz, ...clock })}</span>
      {kind && <StatusChip size="sm" {...attendanceChip(kind)} />}
    </span>
  );
}
