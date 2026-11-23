import { packageSummary, reportAt, type ChildSummary } from '@ab/client-core';
import { type PortalMonth, type PortalPackage } from '@ab/shared';
import { dateText } from '@ab/time';
import { Link } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Dot, Pill } from '@ab/web-kit/components/ui/surface/pill';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { amountText, usedOfText } from '@ab/web-kit/portal/package/package-text';

const DAY = { day: 'numeric', month: 'long' } as const;
const LINE = 'flex flex-wrap items-center gap-x-3 gap-y-1';
const LABEL = 'text-xs text-ink-3';

/** «آخر تقرير · 12 نوفمبر» on the family's clock, or «لم يصل تقرير بعد». */
const lastLine = (summary: ChildSummary, tz: string): string => {
  const last = summary.lastReport;
  if (!last) return t.portal.app.children.noReport;
  const day = dateText(new Date(reportAt(last)), { tz, locale }, DAY);
  return t.portal.app.children.lastReport.replace('{date}', day);
};

/** «هذا الشهر · حضر 6 · غاب 1» as two dots (data, not boxes). */
function MonthDots({ month }: { month: PortalMonth }) {
  return (
    <p className={LINE}>
      <span className={LABEL}>{t.portal.thisMonth}</span>
      <Dot tone="ok" className="tabular-nums">
        {t.portal.monthAttended.replace('{n}', String(month.attended))}
      </Dot>
      <Dot tone="neutral" className="tabular-nums">
        {t.portal.monthAbsent.replace('{n}', String(month.absent))}
      </Dot>
    </p>
  );
}

const PACKAGE_LINK =
  'ab-press -mx-2 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 ' +
  'transition-[transform,background-color] duration-(--duration-press) ease-ink hover:bg-sunk';

/**
 * «الباقة · 8 من 12» and the amount due as the one pill that asks the family to act; the line
 * opens the package's own page (/package/<id>, the family app's `package/[id]`).
 */
function PackageFigure({ pkg, studentId }: { pkg: PortalPackage; studentId: string }) {
  const summary = packageSummary(pkg);
  return (
    <Link to="/package/$studentId" params={{ studentId }} className={PACKAGE_LINK}>
      <span className={LABEL}>{t.portal.packageTab}</span>
      <span className="text-sm font-semibold tabular-nums">{usedOfText(summary)}</span>
      {summary.amountDue && (
        <Pill tone="act">
          {`${t.portal.amountDue}: ${amountText(summary.amountDue)}`}
        </Pill>
      )}
      <Icon name="chevron-left" className="ms-auto size-4 text-ink-3" />
    </Link>
  );
}

interface Props {
  summary: ChildSummary;
  /** A guardian's (seesMoney) live package; null for a child's own login or without one. */
  pkg: PortalPackage | null;
  tz: string;
  /** The student whose package the line opens. */
  studentId: string;
}

/** The card's quiet lines under the next lesson: the last report, this month, the package. */
export function SummaryFigures({ summary, pkg, tz, studentId }: Props) {
  return (
    <div className="grid gap-2 border-t border-rule pt-3">
      <p className="text-sm text-ink-2">{lastLine(summary, tz)}</p>
      {summary.month && <MonthDots month={summary.month} />}
      {pkg && <PackageFigure pkg={pkg} studentId={studentId} />}
    </div>
  );
}
