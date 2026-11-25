import { Link } from '@tanstack/react-router';
import {
  Ltr,
  NuqtaGlyph,
  StatusChip,
  t,
  teacherLabel,
  useClock,
  useViewerTz,
  useLessonStatusText,
} from '@ab/web-kit';
import { whenViewer } from '@/features/reporting/dashboard/shared/format';
import type { PendingReportRow } from '@ab/money';

export const workItem = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2.5 last:border-b-0';
export const workLink = 'ms-auto text-xs font-semibold text-lapis underline-offset-4 hover:underline';

export function PendingReportsList({ items }: { items: readonly PendingReportRow[] }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const status = useLessonStatusText();
  if (items.length === 0) return <p className="py-3 text-sm text-ink-2">{t.dashboard.noPendingReports}</p>;
  return (
    <ul>
      {items.map((r) => (
        <li key={`${r.lesson_id}:${r.student.id}`} className={workItem}>
          <NuqtaGlyph shape="hollow" className="size-[9px] shrink-0 text-act" />
          <span className="font-semibold">{r.student.name}</span>
          {r.student.code && <Ltr className="text-2xs text-ink-3">{r.student.code}</Ltr>}
          <span className="text-xs text-ink-2">
            {t.students.withTeacher.replace('{teacher}', teacherLabel(r.teacher))} · {whenViewer(r.starts_at, clock)}
          </span>
          <StatusChip {...status.chip(r.status)} size="sm" />
          <Link
            to="/admin/students/$studentId/reports/$lessonId"
            params={{ studentId: r.student.id, lessonId: r.lesson_id }}
            className={workLink}
          >
            {t.reports.open}
          </Link>
        </li>
      ))}
    </ul>
  );
}
