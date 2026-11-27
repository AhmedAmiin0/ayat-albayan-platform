import { reportAt } from '@ab/client-core';
import { Button, t, teacherLabel, LessonWhen } from '@ab/web-kit';
import type { ReportRowProps } from './ReportRow.types';
import { useReportRow } from './use-report-row';

export function ReportRow({ report, student }: ReportRowProps) {
  const { fresh, open } = useReportRow({ report, student });
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule
        bg-raised p-3"
    >
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
