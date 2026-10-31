import { clockOf, counted } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { dayMonthLabel, zonedParts } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { pendingReportsQuery } from '../api';
import { reportFormHref } from '../paths';
import { ReportLink } from './ReportLink';
import { useClock } from '@/lib/clock';

/**
 * «تقارير لسه ما اتكتبتش» on /teacher (R11, R-TCH-03): started lessons still missing a sent
 * report, oldest first, each opening the report. Nothing when every report is written.
 */
export function PendingReports({ tz }: { tz: string }) {
  const clock = useClock();
  const pending = useQuery(pendingReportsQuery);
  const rows = pending.data ?? [];
  if (rows.length === 0) return null;
  return (
    <section aria-label={t.reports.pending} className="mb-5 grid gap-2 border-b border-rule pb-4">
      <h2 className="flex flex-wrap items-baseline gap-2 font-display text-h3 font-bold">
        {t.reports.pending}
        <span className="font-sans text-xs font-medium text-act">{counted(t.reports.pendingCount, rows.length)}</span>
      </h2>
      <ul className="grid gap-2">
        {rows.map((r) => {
          const at = new Date(r.starts_at);
          return (
            <li key={`${r.lesson_id}:${r.student.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-semibold">{r.student.name}</span>
              <span className="text-xs text-ink-2 tabular-nums">{`${dayMonthLabel(zonedParts(at, tz).date)} ${clockOf(at, { tz, ...clock })}`}</span>
              <ReportLink href={reportFormHref({ role: 'teacher', lessonId: r.lesson_id, studentId: r.student.id })} size="lg" className="ms-auto">
                {r.report_id ? t.reports.resume : t.reports.open}
              </ReportLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
