import type { PortalMonth } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';

/** «هذا الشهر: حضر 6 · غاب 1» (the student's calendar month); an older API sends nothing. */
export function MonthCounts({ month }: { month: PortalMonth | undefined }) {
  if (!month) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm" aria-label={t.portal.thisMonth}>
      <span className="text-ink-3">{t.portal.thisMonth}</span>
      <span className="rounded-sm bg-ok-soft px-2 py-0.5 font-semibold text-ok tabular-nums">
        {t.portal.monthAttended.replace('{n}', String(month.attended))}
      </span>
      <span className="rounded-sm bg-neutral-soft px-2 py-0.5 font-semibold text-ink-2 tabular-nums">
        {t.portal.monthAbsent.replace('{n}', String(month.absent))}
      </span>
    </p>
  );
}
