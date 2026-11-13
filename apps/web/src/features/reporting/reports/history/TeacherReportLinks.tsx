import { reportStage } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { useNow } from '@/lib/time/use-now';
import { REPORT_STAGE_LABEL, reportFormHref } from '@/features/reporting/reports/paths';
import { ReportLink } from './ReportLink';

export interface TeacherReportLinksProps {
  lesson: LessonView;
  size?: 'sm' | 'md' | 'lg';
  /** The card's lead (docs/48): one student's control is filled; a group's stay secondary. */
  filled?: boolean;
}

type Student = LessonView['students'][number];

/** One student's own stage: reportStage on the lesson with that student alone (docs/49 R3). */
const ownStage = (lesson: LessonView, s: Student, now: Date) =>
  reportStage({ ...lesson, students: [s] }, now);

/**
 * The teacher's reports of one lesson (docs/49 «Drawer rule»): shown whenever reportStage is not
 * null, so still listed after the send. One student: one control labelled by the stage; a group:
 * one secondary control per student, «الاسم: …» by that student's own stage. All open
 * /teacher/report/$lessonId, which holds every student's entry.
 */
export function TeacherReportLinks({ lesson, size = 'sm', filled = false }: TeacherReportLinksProps) {
  // The live clock (docs/48): the control appears by itself at the start minute.
  const now = useNow();
  if (reportStage(lesson, now) === null) return null;
  const href = reportFormHref({ role: 'teacher', lessonId: lesson.id, studentId: '' });
  const many = lesson.students.length > 1;
  const variant = filled && !many ? 'primary' : 'secondary';
  return (
    <div className="flex flex-wrap gap-2">
      {lesson.students.map((s) => {
        const label = REPORT_STAGE_LABEL[ownStage(lesson, s, now) ?? 'write'];
        return (
          <ReportLink key={s.id} href={href} size={size} variant={variant}>
            {many ? `${s.name}: ${label}` : label}
          </ReportLink>
        );
      })}
    </div>
  );
}
