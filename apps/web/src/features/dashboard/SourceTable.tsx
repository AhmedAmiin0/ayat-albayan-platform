import type { SourceRow } from '@ab/shared';
import { t } from '@/lib/i18n';
import { Bar } from './Bar';
import { amount, percent } from './format';

const sourceLabel = (s: SourceRow['source']) => (s === 'unknown' ? t.dashboard.unknownSource : t.enums.leadSource[s]);

/**
 * R-RPT-02 attribution (issue E4): lead source → leads → converted → revenue, teacher cost and
 * margin. Revenue carries the bar (one scale across sources); the rest are numbers.
 */
export function SourceTable({ rows }: { rows: readonly SourceRow[] }) {
  const max = Math.max(0, ...rows.map((r) => r.revenue));
  const num = 'py-2 pe-3 text-end tabular-nums';
  return (
    <figure className="grid gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{t.dashboard.bySource}</caption>
          <thead>
            <tr className="border-b-[3px] border-double border-gold text-xs text-ink-3">
              <th scope="col" className="py-2 pe-3 text-start font-semibold">{t.guardians.source}</th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">{t.dashboard.leads}</th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">{t.dashboard.converted}</th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">{t.dashboard.conversion}</th>
              <th scope="col" className="py-2 pe-3 text-start font-semibold">{t.dashboard.revenue}</th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">{t.dashboard.teacherCost}</th>
              <th scope="col" className="py-2 text-end font-semibold">{t.dashboard.grossMargin}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className="border-b border-rule last:border-b-0">
                <th scope="row" className="py-2 pe-3 text-start font-semibold whitespace-nowrap">{sourceLabel(r.source)}</th>
                <td className={num}>{r.leads}</td>
                <td className={num}>{r.converted}</td>
                <td className={num}>
                  <bdi dir="ltr">{percent(r.leads > 0 ? r.converted / r.leads : null)}</bdi>
                </td>
                <td className="py-2 pe-3">
                  <span className="flex items-center gap-2">
                    <Bar value={r.revenue} max={max} />
                    <bdi dir="ltr" className="min-w-14 text-end tabular-nums">{amount(r.revenue)}</bdi>
                  </span>
                </td>
                <td className={num}>
                  <bdi dir="ltr">{amount(r.teacher_cost)}</bdi>
                </td>
                <td className="py-2 text-end font-semibold tabular-nums">
                  <bdi dir="ltr">{amount(r.gross_margin)}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="text-xs text-pretty text-ink-3">{t.dashboard.adSpendNote}</figcaption>
    </figure>
  );
}
