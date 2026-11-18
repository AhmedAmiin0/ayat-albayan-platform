import { portalViewer, readsOwn, reportMonths } from '@ab/client-core';
import { localDateIn, type PortalKind, type PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { TitledPage } from '@ab/web-kit/components/family/layout/TitledPage';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { portalReportsQuery } from '@ab/web-kit/portal/api';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { MonthCard } from './MonthCard';

const P = t.familyLook.pages.reports;

/** «تقارير هذا الشهر» (boards: the cream stat tile): this month's count on the student's clock. */
function MonthStat({ count }: { count: number }) {
  return (
    <dl className="flex w-fit min-w-[180px] flex-col gap-0.5 rounded-2xl border border-rule
      bg-sunk px-4 py-3">
      <dt className="order-2 text-sm font-semibold text-ink-3">{t.portal.app.reports.thisMonth}</dt>
      <dd className="order-1 text-[26px] font-extrabold leading-snug text-ink">{count}</dd>
    </dl>
  );
}

function Reports({ student }: { student: PortalStudent }) {
  const query = useQuery(portalReportsQuery(student.id));
  const thisMonth = localDateIn(useNow(), student.tz).slice(0, 7);
  return (
    <LoadState query={query}>
      {({ reports }) => {
        if (reports.length === 0) return <EmptyState title={t.portal.app.reports.empty} />;
        const months = reportMonths(reports, student.tz);
        const current = months.find((m) => m.month === thisMonth)?.rows.length ?? 0;
        return (
          <>
            <MonthStat count={current} />
            {months.map(({ month, rows }) => (
              <MonthCard key={month} month={month} rows={rows} student={student} />
            ))}
          </>
        );
      }}
    </LoadState>
  );
}

interface Props {
  student: PortalStudent;
  kind: PortalKind;
}

/**
 * «التقارير» (boards PortalWebReports / PortalWebStudentReports): the sent reports of the student
 * in view, newest first, a card per month; «تقاريري» for a student's or an adult's own (owner
 * 2026-11-16).
 */
export function StudentReportsPage({ student, kind }: Props) {
  const own = readsOwn(portalViewer(kind, student));
  const title = own ? t.portal.app.reports.title : t.portal.app.tabs.reports;
  const line = own ? P.lineOwn : P.line.replace('{name}', student.name);
  return (
    <TitledPage id="reports-title" title={title} line={line}>
      <Reports student={student} />
    </TitledPage>
  );
}
