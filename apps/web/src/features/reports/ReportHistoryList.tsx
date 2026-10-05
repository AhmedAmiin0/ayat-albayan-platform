import { gradeStyle, lessonWhenText, type ReportSummaryView, type UserRole } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { PdfAction } from './PdfAction';
import { RecordingLink } from './RecordingLink';

export interface ReportHistoryListProps {
  items: ReportSummaryView[];
  role: UserRole;
  tz: string;
  /** The student, and the lessons that have a finished recording to link to. */
  studentId: string;
  recorded: ReadonlySet<string>;
}

/**
 * The student's submitted reports, newest lesson first (R-REP-05, issue D2: replaces the
 * per-student sheets): when, which lesson, who taught, attendance, overall grade, the PDF.
 */
export function ReportHistoryList({ items, role, tz, studentId, recorded }: ReportHistoryListProps) {
  return (
    <ol className="grid">
      {items.map((r) => (
        <li key={r.id} className="grid gap-2 border-b border-rule py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="grid gap-1">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-semibold">{lessonWhenText(new Date(r.starts_at), tz, locale)}</span>
              {r.lesson_no !== null && (
                <span className="text-xs text-ink-3">{t.reports.lessonNoShort.replace('{n}', String(r.lesson_no))}</span>
              )}
              <span className="text-xs text-ink-2">{r.teacher.display_name_ar}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
              {r.attendance && <span>{t.enums.attendance[r.attendance]}</span>}
              {r.grade_overall && (
                <StatusChip {...gradeStyle[r.grade_overall]} size="sm" label={`${t.reports.overall}: ${t.enums.grade[r.grade_overall]}`} />
              )}
              {r.version > 1 && <span className="text-xs text-ink-3">{t.reports.version.replace('{n}', String(r.version))}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recorded.has(r.lesson_id) && (
              <RecordingLink studentId={studentId} lessonId={r.lesson_id} role={role} when={lessonWhenText(new Date(r.starts_at), tz, locale)} />
            )}
            <PdfAction report={r} role={role} />
          </div>
        </li>
      ))}
    </ol>
  );
}
