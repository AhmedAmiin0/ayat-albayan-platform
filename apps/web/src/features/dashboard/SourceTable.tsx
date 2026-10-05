import type { SourceRow } from '@ab/shared';
import { ScrollX } from '@/components/ui/scroll-x';
import { t } from '@/lib/i18n';
import { Bar } from './Bar';
import { amount, percent } from './format';
import { useHandSort } from './hand-sort';
import { SortableTh } from './SortableTh';

const sourceLabel = (s: SourceRow['source']) => (s === 'unknown' ? t.dashboard.unknownSource : t.enums.leadSource[s]);

type SourceKey = 'source' | 'leads' | 'converted' | 'conversion' | 'revenue' | 'teacher_cost' | 'gross_margin';
const conversion = (r: SourceRow) => (r.leads > 0 ? r.converted / r.leads : null);
/** What each column sorts by: the shown label for the source, the numbers as numbers. */
const valueOf = (r: SourceRow, key: SourceKey): unknown =>
  key === 'source' ? sourceLabel(r.source) : key === 'conversion' ? conversion(r) : r[key];

/**
 * R-RPT-02 attribution (issue E4): lead source → leads → converted → revenue, teacher cost and
 * margin. Revenue carries the bar (one scale across sources); the rest are numbers. A short summary
 * (one row per source), so every column sorts and none filters.
 */
export function SourceTable({ rows }: { rows: readonly SourceRow[] }) {
  const sorter = useHandSort(rows, valueOf);
  const max = Math.max(0, ...rows.map((r) => r.revenue));
  const num = 'py-2 pe-3 text-end tabular-nums';
  return (
    <figure className="grid grid-cols-1 gap-2">
      <ScrollX label={t.dashboard.bySource}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{t.dashboard.bySource}</caption>
          <thead>
            <tr className="border-b border-rule text-xs text-ink-3">
              <SortableTh label={t.guardians.source} sortKey="source" sorter={sorter} className="text-start" />
              <SortableTh label={t.dashboard.leads} sortKey="leads" sorter={sorter} className="text-end" />
              <SortableTh label={t.dashboard.converted} sortKey="converted" sorter={sorter} className="text-end" />
              <SortableTh label={t.dashboard.conversion} sortKey="conversion" sorter={sorter} className="text-end" />
              <SortableTh label={t.dashboard.revenue} sortKey="revenue" sorter={sorter} className="text-start" />
              <SortableTh label={t.dashboard.teacherCost} sortKey="teacher_cost" sorter={sorter} className="text-end" />
              <SortableTh label={t.dashboard.grossMargin} sortKey="gross_margin" sorter={sorter} className="pe-0 text-end" />
            </tr>
          </thead>
          <tbody>
            {sorter.rows.map((r) => (
              <tr key={r.source} className="border-b border-rule last:border-b-0">
                <th scope="row" className="py-2 pe-3 text-start font-semibold whitespace-nowrap">{sourceLabel(r.source)}</th>
                <td className={num}>{r.leads}</td>
                <td className={num}>{r.converted}</td>
                <td className={num}>
                  <bdi dir="ltr">{percent(conversion(r))}</bdi>
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
      </ScrollX>
      <figcaption className="text-xs text-pretty text-ink-3">{t.dashboard.adSpendNote}</figcaption>
    </figure>
  );
}
