import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { LessonWhen } from '@ab/web-kit/portal/lessons/LessonWhen';
import type { HistoryRowProps } from './HistoryRow.types';
import { AbsenceLines } from './AbsenceLines';
import { ReportAction } from './ReportAction';

/** One past lesson: when, with whom, then its report or its absence. */
export function HistoryRow({ row, student, ...open }: HistoryRowProps) {
  return (
    <li className="grid gap-2 rounded-lg border border-rule bg-raised p-4">
      <LessonWhen startsAt={row.starts_at} tz={student.tz} />
      <p className="text-sm text-ink-2">
        {t.portal.withTeacher.replace('{teacher}', teacherLabel(row.teacher))}
      </p>
      {row.outcome === 'attended' ? (
        <ReportAction row={row} {...open} />
      ) : (
        <AbsenceLines row={row} />
      )}
    </li>
  );
}
