import { clockOf, counted, type PendingReportView, zonedPartsIn } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { pendingReportsQuery } from '@/features/reporting/reports/api';
import { reportFormHref } from '@/features/reporting/reports/paths';
import { ReportLink } from './ReportLink';
import { useClock } from '@/lib/clock';

export interface PendingReportsProps {
  tz: string;
  /** Only this student's (the top of her student file, docs/47); every student when absent. */
  studentId?: string;
  /** The hero's lesson (docs/48): its report is the hero's lead, so it is not listed twice. */
  except?: string | undefined;
}

/** Three rows show; the rest unfold in a native <details> (docs/48: no long pages). */
const SHOWN = 3;

/**
 * «تقارير لم تُكتب بعد» on /teacher (R11, R-TCH-03, docs/48): started lessons still missing a sent
 * report, oldest first, each opening the report. Nothing while loading and nothing when every
 * report is written; an error with «حاول مرة أخرى» only when nothing is cached.
 */
export function PendingReports({ tz, studentId, except }: PendingReportsProps) {
  const pending = useQuery(pendingReportsQuery);
  const kept = (r: PendingReportView) =>
    (studentId === undefined || r.student.id === studentId) && r.lesson_id !== except;
  const rows = (pending.data ?? []).filter(kept);
  if (rows.length === 0) {
    return !pending.data && pending.isError ? <PendingError onRetry={pending.refetch} /> : null;
  }
  const more = rows.slice(SHOWN);
  return (
    <section aria-label={t.reports.pending} className="mb-5 grid gap-2 border-b border-rule pb-4">
      <h2 className="flex flex-wrap items-baseline gap-2 font-display text-h3 font-bold">
        {t.reports.pending}
        <span className="font-sans text-xs font-medium text-act">{counted(t.reports.pendingCount, rows.length)}</span>
      </h2>
      <PendingList rows={rows.slice(0, SHOWN)} tz={tz} />
      {more.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-lapis">
            {t.reports.pendingMore.replace('{n}', String(more.length))}
          </summary>
          <PendingList rows={more} tz={tz} />
        </details>
      )}
    </section>
  );
}

function PendingList({ rows, tz }: { rows: PendingReportView[]; tz: string }) {
  const clock = useClock();
  return (
    <ul className="grid gap-2">
      {rows.map((r) => {
        const at = new Date(r.starts_at);
        const href = reportFormHref({ role: 'teacher', lessonId: r.lesson_id, studentId: r.student.id });
        return (
          <li key={`${r.lesson_id}:${r.student.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-semibold">{r.student.name}</span>
            <span className="text-xs text-ink-2 tabular-nums">
              {`${dayMonthLabel(zonedPartsIn(at, tz).date)} ${clockOf(at, { tz, ...clock })}`}
            </span>
            <ReportLink href={href} size="lg" className="ms-auto">
              {r.report_id ? t.reports.resume : t.reports.open}
            </ReportLink>
          </li>
        );
      })}
    </ul>
  );
}

function PendingError({ onRetry }: { onRetry: () => unknown }) {
  return (
    <FormAlert>
      {t.reports.pendingError}{' '}
      <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
        {t.teacherStudents.retry}
      </Button>
    </FormAlert>
  );
}
