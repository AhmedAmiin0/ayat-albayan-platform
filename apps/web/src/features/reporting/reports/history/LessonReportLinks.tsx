import type { LessonView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { reportFormHref, reportOpen } from '@/features/reporting/reports/paths';
import { ReportLink } from './ReportLink';
import { TeacherReportLinks } from './TeacherReportLinks';

export interface LessonReportLinksProps {
  lesson: LessonView;
  role: 'admin' | 'teacher';
  size?: 'sm' | 'lg';
  /** Teacher only: the card's lead (docs/48), filled for one student. */
  filled?: boolean;
}

/**
 * «تقرير الحلقة» on a lesson card / drawer (R-REP-01: the report is opened from the lesson) once
 * it started and was not cancelled or moved. The teacher's form holds every student of the
 * lesson and lists one control per student (docs/49 «Drawer rule», TeacherReportLinks); the
 * admin opens it per student (one link each in a group lesson).
 */
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
