import { reportAt } from '@ab/client-core';
import { counted, dateText, type PortalKind, type PortalStudent } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { SummaryFigures } from './SummaryFigures';
import { useChildSummary } from './use-child-summary';

const DAY = { day: 'numeric', month: 'long' } as const;

/**
 * «أبنائي» (canvas Children): one child's card, the last report and «جديد», the numbers; it opens
 * the child's page, where «حضرها» holds every report.
 */
export function ChildSummaryCard({ student, kind }: { student: PortalStudent; kind: PortalKind }) {
  const { summary, money } = useChildSummary(student, kind);
  const last = summary.lastReport;
  const lastLine = last
    ? t.portal.app.children.lastReport.replace(
        '{date}',
        dateText(new Date(reportAt(last)), { tz: student.tz, locale }, DAY),
      )
    : t.portal.app.children.noReport;
  return (
    <article aria-label={student.name} className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 className="font-display text-h3 font-bold">{student.name}</h2>
          <p className="text-xs text-ink-3">{lastLine}</p>
        </div>
        {summary.newReports > 0 && (
          <span className="rounded-sm bg-act-soft px-2 py-0.5 text-xs font-semibold text-act">
            {counted(t.portal.newReports, summary.newReports)}
          </span>
        )}
      </header>
      <SummaryFigures summary={summary} money={money} />
      <Link
        to="/children/$studentId"
        params={{ studentId: student.id }}
        className={buttonVariants({ variant: 'secondary', className: 'justify-self-start' })}
      >
        {t.portal.openChild}
      </Link>
    </article>
  );
}
