import type { LessonView } from '@ab/schedule';
import { t, useNow } from '@ab/web-kit';
import { reportFormHref, reportOpen } from '@/features/reporting/reports/paths';
import { ReportLink } from '@/features/reporting/reports/history/ReportLink';
import { TeacherReportLinks } from '@/features/reporting/reports/history/TeacherReportLinks';

export interface LessonReportLinksProps {
  lesson: LessonView;
  role: 'admin' | 'teacher';
  size?: 'sm' | 'lg';
  /** Teacher only: the card's lead (docs/48), filled for one student. */
  filled?: boolean;
}

/** Shown once the lesson started and was not cancelled or moved (R-REP-01, docs/49). */
export function LessonReportLinks({ lesson, role, size = 'sm', filled }: LessonReportLinksProps) {
  return role === 'teacher' ? (
    <TeacherReportLinks lesson={lesson} size={size} filled={filled} />
  ) : (
    <AdminReportLinks lesson={lesson} size={size} />
  );
}

function AdminReportLinks({ lesson, size }: { lesson: LessonView; size: 'sm' | 'lg' }) {
  // The live clock (docs/48): the link appears by itself at the start minute.
  const now = useNow();
  if (!reportOpen(lesson, now) || lesson.students.length === 0) return null;
  const students = lesson.students;
  const many = students.length > 1;
  return (
    <div className="flex flex-wrap gap-2">
      {students.map((s) => (
        <ReportLink key={s.id} size={size} href={reportFormHref({ role: 'admin', lessonId: lesson.id, studentId: s.id })}>
          {many ? t.reports.entryFor.replace('{name}', s.name) : t.reports.formTitle}
        </ReportLink>
      ))}
    </div>
  );
}
