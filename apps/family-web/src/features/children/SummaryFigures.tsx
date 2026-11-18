import type { ChildSummary } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Figure {
  label: string;
  value: number | null;
  /** A missed lesson's count reads in the bad tone (board PortalWebChildren). */
  bad?: boolean;
}

const figuresOf = (summary: ChildSummary, money: boolean): Figure[] => [
  { label: t.portal.app.children.upcoming, value: summary.upcoming },
  { label: t.portal.app.children.attended, value: summary.month?.attended ?? null },
  { label: t.portal.app.children.absent, value: summary.month?.absent ?? null, bad: true },
  ...(money ? [{ label: t.portal.app.children.left, value: summary.remaining }] : []),
];

/** A count of missed lessons above zero. */
const alarming = (figure: Figure): boolean => Boolean(figure.bad && figure.value);

/** The card's numbers as cream stat tiles: upcoming, this month's attended / absent, left. */
export function SummaryFigures({ summary, money }: { summary: ChildSummary; money: boolean }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2.5">
      {figuresOf(summary, money).map((figure) => (
        <div key={figure.label}
          className="flex flex-col gap-0.5 rounded-2xl border border-rule bg-sunk px-3.5 py-3">
          <dt className="order-2 text-[13px] font-semibold text-ink-3">{figure.label}</dt>
          <dd className={`order-1 text-[26px] font-extrabold leading-tight tabular-nums
            ${alarming(figure) ? 'text-danger' : 'text-ink'}`}>
            {figure.value ?? '–'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
