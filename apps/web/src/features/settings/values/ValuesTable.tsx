import { counted } from '@ab/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { rowKey, type ValueRow } from './value-rows';
import { ValueRowView, type RowEnv } from './rows/ValueRowView';

const v = t.settingsValues;

export interface ValuesTableProps {
  /** The group's name, or «الكل» for search/filter results. */
  caption: string;
  /** A short line under the caption (the module views: where they are edited). */
  note?: string | undefined;
  rows: readonly ValueRow[];
  env: RowEnv;
  loading: boolean;
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <tr key={i} aria-hidden="true" className="h-[52px] border-b border-rule">
          {Array.from({ length: cols }, (_, j) => (
            <td key={j} className="py-3 pe-4">
              <Skeleton className={j === 0 ? 'w-40' : 'w-20'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * The key/value/description table (docs/26b §2): a caption naming the group and its count, column
 * headers, one row per value. Desktop: الاسم | القيمة | الافتراضي | آخر تعديل | إجراء; phones keep the
 * first two. While loading: skeleton rows of the real height and aria-busy on the table.
 */
export function ValuesTable({ caption, note, rows, env, loading }: ValuesTableProps) {
  const cols = env.phone ? [v.cols.name, v.cols.value] : [v.cols.name, v.cols.value, v.cols.default, v.cols.last, v.cols.action];
  return (
    <div className="min-w-0 overflow-x-auto">
      <table aria-busy={loading || undefined} className="w-full border-collapse text-start">
        <caption className="mb-2 text-start">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-bold text-ink">{caption}</span>
            {loading ? <span className="text-xs text-ink-3">{v.loading}</span> : <span className="text-xs text-ink-3">{counted(v.count, rows.length)}</span>}
          </span>
          {note && <span className="block text-xs text-ink-3">{note}</span>}
        </caption>
        <thead>
          <tr className="border-b border-rule-strong">
            {cols.map((c) => (
              <th key={c} scope="col" className="py-2 pe-4 text-start text-xs font-semibold text-ink-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{loading ? <SkeletonRows cols={cols.length} /> : rows.map((row) => <ValueRowView key={rowKey(row)} row={row} env={env} />)}</tbody>
      </table>
    </div>
  );
}
