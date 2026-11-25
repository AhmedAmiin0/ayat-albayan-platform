import { portalViewer, readsOwn, reportMonths } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { dateText } from '@ab/time';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { portalReportsQuery } from '@ab/web-kit/portal/api';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { ReportRow } from './ReportRow';

const MONTH = { month: 'long', year: 'numeric' } as const;
const monthTitle = (month: string) =>
  dateText(new Date(`${month}-15T12:00:00Z`), { tz: 'UTC', locale }, MONTH);

function Reports({ student }: { student: PortalStudent }) {
  const query = useQuery(portalReportsQuery(student.id));
  return (
    <QueryState query={query}>
      {({ reports }) =>
        reports.length === 0 ? (
          <EmptyState title={t.portal.app.reports.empty} />
        ) : (
          reportMonths(reports, student.tz).map(({ month, rows }) => (
            <section key={month} aria-label={monthTitle(month)} className="grid gap-2">
              <h2 className="text-sm font-semibold text-ink-2">{monthTitle(month)}</h2>
              <ul className="grid gap-2">
                {rows.map((report) => (
                  <ReportRow key={report.id} report={report} student={student} />
                ))}
              </ul>
            </section>
          ))
        )
      }
    </QueryState>
  );
}

interface Props {
  student: PortalStudent;
  kind: PortalKind;
}

/** Sent reports only, newest first, grouped by month. */
export function StudentReportsPage({ student, kind }: Props) {
  const own = readsOwn(portalViewer(kind, student));
  return (
    <section aria-labelledby="reports-title" className="grid gap-4">
      <h1 id="reports-title" className="font-display text-h2 font-bold">
        {own ? t.portal.app.reports.title : t.portal.app.tabs.reports}
      </h1>
      <Reports student={student} />
    </section>
  );
}
