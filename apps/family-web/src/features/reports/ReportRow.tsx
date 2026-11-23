import { isNewReport, reportAt } from '@ab/client-core';
import type { PortalReport, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ab/web-kit/form';
import { t, teacherLabel } from '@ab/web-kit/i18n';
import { LessonWhen, markReportSeen, useSeenReports } from '@ab/web-kit/portal';

/** One report of the student's «التقارير»: the lesson's time, the teacher, «جديد», open. */
export function ReportRow({ report, student }: { report: PortalReport; student: PortalStudent }) {
  const navigate = useNavigate();
  const fresh = isNewReport(report.id, useSeenReports());
  const open = () => {
    markReportSeen(report.id);
    void navigate({
      to: '/report/$reportId',
      params: { reportId: report.id },
      search: { studentId: student.id, recording: report.recording_id ?? undefined },
    });
  };
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule
      bg-raised p-3">
      <div className="grid gap-0.5">
        <LessonWhen startsAt={reportAt(report)} tz={student.tz} />
        {report.teacher && <p className="text-sm text-ink-2">{teacherLabel(report.teacher)}</p>}
      </div>
      <div className="flex items-center gap-2">
        {fresh && (
          <span className="rounded-sm bg-act-soft px-1.5 py-0.5 text-xs font-semibold text-act">
            {t.portal.newReport}
          </span>
        )}
        <Button type="button" size="sm" onClick={open}>
          {t.portal.openReport}
        </Button>
      </div>
    </li>
  );
}
