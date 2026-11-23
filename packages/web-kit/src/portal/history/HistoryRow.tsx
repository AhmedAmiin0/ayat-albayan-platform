import { isNewReport } from '@ab/client-core';
import type { PortalHistoryRow, PortalStudent } from '@ab/shared';
import { Icon, Button } from '#/components/ui/index.ts';
import { t, teacherLabel } from '#/lib/i18n/index.ts';
import { LessonWhen } from '#/portal/lessons/LessonWhen.tsx';
import type { OpenReport } from '#/portal/report/ReportView.tsx';
import { markReportSeen, useSeenReports } from '#/portal/use-seen-reports.ts';

interface Props {
  row: PortalHistoryRow;
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
  /** The lesson's own page (the family web): «ملفات الحلقة» beside the report. */
  onOpenLesson?: (lessonId: string) => void;
}

/** «جديد» beside a report not opened in this browser yet. */
const NewMark = () => (
  <span className="rounded-sm bg-act-soft px-1.5 py-0.5 text-xs font-semibold text-act">
    {t.portal.newReport}
  </span>
);

/** An attended lesson's report (with «جديد» until opened here); the recording rides with it. */
function ReportAction({ row, onOpenReport, onOpenLesson }: Omit<Props, 'student'>) {
  const seen = useSeenReports();
  const reportId = row.report_id;
  if (!reportId) return null;
  const open = () => {
    markReportSeen(reportId);
    onOpenReport({ reportId, recordingId: row.recording_id });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={open}>
        {t.portal.openReport}
      </Button>
      {isNewReport(reportId, seen) && <NewMark />}
      {onOpenLesson && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenLesson(row.lesson_id)}>
          <Icon name="template" />
          {t.lessonFiles.title}
        </Button>
      )}
    </div>
  );
}

/** An absence: «غياب بعذر» when excused, and the family's reason when one was recorded. */
function AbsenceLines({ row }: { row: PortalHistoryRow }) {
  return (
    <>
      {row.outcome === 'excused' && <p className="text-sm text-ink-2">{t.portal.excused}</p>}
      {row.absence_reason && (
        <p className="text-sm text-ink-2">
          {t.portal.absenceReason.replace('{reason}', row.absence_reason)}
        </p>
      )}
    </>
  );
}

/** One past lesson: when, with whom, then its report or its absence. */
export function HistoryRow({ row, student, ...open }: Props) {
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
