import type { ChildSummary } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Figure {
  label: string;
  value: number | null;
}

const figuresOf = (summary: ChildSummary, money: boolean): Figure[] => [
  { label: t.portal.app.children.upcoming, value: summary.upcoming },
  { label: t.portal.app.children.attended, value: summary.month?.attended ?? null },
  { label: t.portal.app.children.absent, value: summary.month?.absent ?? null },
  ...(money ? [{ label: t.portal.app.children.left, value: summary.remaining }] : []),
];

/** The card's numbers: upcoming, this month's attended / absent, lessons left (money only). */
export function SummaryFigures({ summary, money }: { summary: ChildSummary; money: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {figuresOf(summary, money).map((figure) => (
        <div key={figure.label} className="grid gap-0.5 rounded-md bg-sunk px-3 py-2">
          <dt className="text-2xs text-ink-3">{figure.label}</dt>
          <dd className="text-h4 font-bold tabular-nums">{figure.value ?? '–'}</dd>
        </div>
      ))}
    </dl>
  );
}
