import { isNewReport, reportAt } from '@ab/client-core';
import type { PortalReport, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { DateTile } from '@ab/web-kit/family/pages/DateTile';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { cn } from '@ab/web-kit/lib/utils';
import { LessonWhen } from '@ab/web-kit/portal/lessons/LessonWhen';
import { markReportSeen, useSeenReports } from '@ab/web-kit/portal/use-seen-reports';

const FRESH = 'border-gold bg-gold-wash';
const SEEN = 'border-rule bg-raised hover:bg-sunk';

/**
 * One report of the student's «التقارير» (boards: PortalWebReports' rows): the date tile, the
 * lesson's time, the teacher, «جديد», a recording marker and «افتح تقرير الحلقة»; the whole card
 * (the button's stretched hit area) opens the report and marks it seen.
 */
export function ReportRow({ report, student }: { report: PortalReport; student: PortalStudent }) {
  const navigate = useNavigate();
  const fresh = isNewReport(report.id, useSeenReports());
  const at = reportAt(report);
  const open = () => {
    markReportSeen(report.id);
    void navigate({
      to: '/report/$reportId',
      params: { reportId: report.id },
      search: { studentId: student.id, recording: report.recording_id ?? undefined },
    });
  };
  return (
    <li className={cn('relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px]',
      'border px-4 py-2.5 transition-colors', fresh ? FRESH : SEEN)}>
      <DateTile at={new Date(at)} tz={student.tz} />
      <div className="grid min-w-[10rem] flex-1 gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <LessonWhen startsAt={at} tz={student.tz} />
          {fresh && (
            <span className="inline-flex min-h-6 items-center rounded-full
              bg-[image:var(--fam-gold-fill)] px-2.5 text-xs font-extrabold text-fam-on-gold">
              {t.portal.newReport}
            </span>
          )}
        </div>
        {report.teacher && <p className="text-sm text-ink-3">{teacherLabel(report.teacher)}</p>}
      </div>
      {report.recording_id && (
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border
          border-fam-mint-rule bg-fam-mint px-3 text-xs font-bold text-fam-mint-ink">
          <Icon name="mic" className="size-4" />
          {t.familyLook.pages.reports.recording}
        </span>
      )}
      <button type="button" onClick={open} className="inline-flex min-h-11 items-center gap-1.5
        rounded-full text-sm font-extrabold text-lapis after:absolute after:inset-0
        after:rounded-[18px] after:content-['']">
        {t.portal.openReport}
        <Icon name="chevron-left" className="size-4" />
      </button>
    </li>
  );
}
