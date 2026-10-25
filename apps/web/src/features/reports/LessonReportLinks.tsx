import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { reportFormHref, reportOpen } from './paths';
import { ReportLink } from './ReportLink';

export interface LessonReportLinksProps {
  lesson: LessonView;
  role: 'admin' | 'teacher';
  size?: 'sm' | 'lg';
}

/**
 * «تقرير الحلقة» on a lesson card / drawer (R-REP-01: the report is opened from the lesson) once
 * it started and was not cancelled or moved. The teacher's form holds every student of the
 * lesson; the admin opens it per student (one link each in a group lesson).
 */
export function LessonReportLinks({ lesson, role, size = 'sm' }: LessonReportLinksProps) {
  const [now] = useState(() => new Date());
  if (!reportOpen(lesson, now) || lesson.students.length === 0) return null;
  const students = role === 'teacher' ? lesson.students.slice(0, 1) : lesson.students;
  const many = students.length > 1;
  return (
    <div className="flex flex-wrap gap-2">
      {students.map((s) => (
        <ReportLink key={s.id} size={size} href={reportFormHref({ role, lessonId: lesson.id, studentId: s.id })}>
          {many ? t.reports.entryFor.replace('{name}', s.name) : t.reports.formTitle}
        </ReportLink>
      ))}
    </div>
  );
}
