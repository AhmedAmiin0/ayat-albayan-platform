import { MonthDots } from './MonthDots';
import { PackageFigure } from './PackageFigure';
import { lastLine } from './summary-figures.helpers';
import type { SummaryFiguresProps } from './SummaryFigures.types';

/** The card's quiet lines under the next lesson: the last report, this month, the package. */
export function SummaryFigures({ summary, pkg, tz, studentId }: SummaryFiguresProps) {
  return (
    <div className="grid gap-2 border-t border-rule pt-3">
      <p className="text-sm text-ink-2">{lastLine(summary, tz)}</p>
      {summary.month && <MonthDots month={summary.month} />}
      {pkg && <PackageFigure pkg={pkg} studentId={studentId} />}
    </div>
  );
}
