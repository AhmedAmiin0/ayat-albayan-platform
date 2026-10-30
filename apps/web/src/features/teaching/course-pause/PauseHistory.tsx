import type { CoursePauseView } from '@ab/shared';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

const rangeText = (p: CoursePauseView): string =>
  t.coursePause.historyRange
    .replace('{from}', dateLabel(p.from_date))
    .replace('{until}', p.until_date === null ? t.coursePause.historyOpenEnd : dateLabel(p.until_date));

/** «سجل الإيقاف»: the ended pauses, newest first (collapsed: it is reference, not work). */
export function PauseHistory({ history }: { history: readonly CoursePauseView[] }) {
  if (history.length === 0) return null;
  return (
    <details className="text-sm text-ink-2">
      <summary className="cursor-pointer py-1 text-xs font-semibold text-ink-3">{t.coursePause.history}</summary>
      <ul className="mt-2 grid gap-1.5">
        {history.map((p) => (
          <li key={p.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{rangeText(p)}</span>
            {p.extended_days !== null && <span className="text-ink-3">{t.coursePause.historyDays.replace('{n}', String(p.extended_days))}</span>}
            {p.reason && <span className="text-ink-3">{t.coursePause.bannerReason.replace('{reason}', p.reason)}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
