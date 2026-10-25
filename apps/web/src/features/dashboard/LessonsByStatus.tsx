import { LESSON_STATUSES, lessonStatusStyle, type LessonStatus } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n';
import { Bar } from './Bar';

/**
 * This week's lessons by status (R-RPT-01): one row per status that has lessons, the status chip
 * (glyph + word: identity is never colour alone), a neutral bar and the count. A <table>, so it is
 * its own accessible table view.
 */
export function LessonsByStatus({ counts }: { counts: Record<LessonStatus, number> }) {
  const rows = LESSON_STATUSES.filter((s) => counts[s] > 0);
  const max = Math.max(0, ...rows.map((s) => counts[s]));
  if (rows.length === 0) return <p className="text-sm text-ink-2">{t.dashboard.noLessons}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t.dashboard.lessonsByStatus}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t.students.status}</th>
          <th scope="col">{t.payouts.lessons}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s} className="border-b border-rule last:border-b-0">
            <th scope="row" className="w-0 py-2 pe-3 text-start font-normal">
              <StatusChip {...lessonStatusStyle[s]} label={t.enums.lessonStatus[s]} size="sm" />
            </th>
            <td className="py-2">
              <span className="flex items-center gap-3">
                <Bar value={counts[s]} max={max} />
                <span className="w-8 text-end font-semibold tabular-nums">{counts[s]}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
