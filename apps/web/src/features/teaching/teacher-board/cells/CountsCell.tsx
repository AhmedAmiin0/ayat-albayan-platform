import type { BoardRow } from '@/features/teaching/teacher-board/board-rows';
import { t } from '@/lib/i18n/i18n';

/** «حضر n · غاب n» in the window, then «نسبة الحضور n%» once something was marked. */
export function CountsCell({ row }: { row: BoardRow }) {
  const w = t.teacherBoard;
  const { present, absent } = row.summary.counts;
  const counts = w.counts.replace('{present}', String(present)).replace('{absent}', String(absent));
  return (
    <span className="grid gap-0.5">
      <span>{counts}</span>
      {row.rate !== null && (
        <span className="text-xs text-ink-2">{w.rate.replace('{rate}', String(row.rate))}</span>
      )}
    </span>
  );
}
