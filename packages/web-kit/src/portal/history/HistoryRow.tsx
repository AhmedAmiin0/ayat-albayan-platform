import { isNewReport } from '@ab/client-core';
import type { PortalHistoryRow, PortalStudent } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { DateTile } from '@ab/web-kit/components/family/layout/DateTile';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { LessonWhen } from '@ab/web-kit/portal/lessons/LessonWhen';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { markReportSeen, useSeenReports } from '@ab/web-kit/portal/use-seen-reports';

interface Props {
  row: PortalHistoryRow;
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
}

/** «جديد» beside a report not opened in this browser yet (the family look: a gold pill first). */
const NewMark = () => (
  <span
    data-new=""
    className="rounded-sm bg-act-soft px-1.5 py-0.5 text-xs font-semibold text-act family:order-first
      family:rounded-full family:bg-[image:var(--fam-gold-fill)] family:px-2.5 family:font-extrabold
      family:text-fam-on-gold"
  >
    {t.portal.newReport}
  </span>
);

/** An attended lesson's report (with «جديد» until opened here); the recording rides with it. */
function ReportAction({ row, onOpenReport }: Omit<Props, 'student'>) {
  const seen = useSeenReports();
  const reportId = row.report_id;
  if (!reportId) return null;
  const open = () => {
    markReportSeen(reportId);
    onOpenReport({ reportId, recordingId: row.recording_id });
  };
  return (
    <div className="flex flex-wrap items-center gap-2 family:shrink-0">
      <Button
        type="button"
        size="sm"
        className="family:min-h-11 family:px-4 family:text-sm family:font-extrabold
          family:shadow-[0_8px_18px_rgba(4,120,87,0.22)] family:sm:min-h-11"
        onClick={open}
      >
        {t.portal.openReport}
      </Button>
      {isNewReport(reportId, seen) && <NewMark />}
    </div>
  );
}

/** An absence: «غياب بعذر» when excused, and the family's reason when one was recorded. */
function AbsenceLines({ row }: { row: PortalHistoryRow }) {
  return (
    <>
      {row.outcome === 'excused' && (
        <p className="text-sm text-ink-2 family:font-bold">{t.portal.excused}</p>
      )}
      {row.absence_reason && (
        <p className="text-sm text-ink-2 family:font-bold">
          {t.portal.absenceReason.replace('{reason}', row.absence_reason)}
        </p>
      )}
    </>
  );
}

/**
 * One past lesson: when, with whom, then its report or its absence. The family look (boards
 * PortalWebAttended / PortalWebAbsent): a white row card with the date tile, a gold edge while a
 * new report waits.
 */
export function HistoryRow({ row, student, onOpenReport }: Props) {
  const attended = row.outcome === 'attended';
  return (
    <li
      className="grid gap-2 rounded-lg border border-rule bg-raised p-4 family:flex
        family:min-h-[84px] family:flex-wrap family:items-center family:gap-3.5 family:rounded-[18px]
        family:px-4 family:py-3 family:shadow-fam-card family:has-data-new:border-gold"
    >
      <DateTile at={row.starts_at} tz={student.tz} familyOnly />
      <div className="contents family:grid family:min-w-0 family:flex-[1_1_12rem] family:gap-0.5">
        <LessonWhen startsAt={row.starts_at} tz={student.tz} />
        <p className="text-sm text-ink-2 family:text-ink-3">
          {t.portal.withTeacher.replace('{teacher}', teacherLabel(row.teacher))}
        </p>
        {!attended && <AbsenceLines row={row} />}
      </div>
      {attended && <ReportAction row={row} onOpenReport={onOpenReport} />}
    </li>
  );
}
