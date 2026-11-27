import { packageSummary } from '@ab/client-core';
import { Link } from '@tanstack/react-router';
import { Icon, Pill, t, amountText, usedOfText } from '@ab/web-kit';
import { LABEL } from '@/features/children/SummaryFigures/summary-figures.helpers';
import { PACKAGE_LINK } from './package-figure.helpers';
import type { PackageFigureProps } from './PackageFigure.types';

/** The amount due is the one pill that asks the family to act. */
export function PackageFigure({ pkg, studentId }: PackageFigureProps) {
  const summary = packageSummary(pkg);
  return (
    <Link to="/package/$studentId" params={{ studentId }} className={PACKAGE_LINK}>
      <span className={LABEL}>{t.portal.packageTab}</span>
      <span className="text-sm font-semibold tabular-nums">{usedOfText(summary)}</span>
      {summary.amountDue && (
        <Pill tone="act">{`${t.portal.amountDue}: ${amountText(summary.amountDue)}`}</Pill>
      )}
      <Icon name="chevron-left" className="ms-auto size-4 text-ink-3" />
    </Link>
  );
}
