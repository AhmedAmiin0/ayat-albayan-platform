import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures, FilterOption } from '@/components/DataTable';
import { EnterButton } from '@/features/classroom/JoinButton';
import { t } from '@/lib/i18n';
import type { SalesMeeting } from './api';

const col = createColumnHelper<DataTableFeatures, SalesMeeting>();
const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** The teacher filter: the day's teachers, by name. */
export const teacherOptionsOf = (rows: readonly SalesMeeting[]): FilterOption[] =>
  [...new Set(rows.map((m) => m.teacher_name))].map((name) => ({ value: name, label: name }));

/**
 * One day's meetings (loaded whole, so sorted and filtered locally): time, who (lead or student),
 * the teacher, and «ادخل الحلقة» (15 min before to 2 h after). Stacked under 640px.
 */
export function salesMeetingColumns(teachers: FilterOption[]) {
  return col.columns([
    col.accessor('starts_at', {
      header: () => t.sales.schedule.time,
      cell: (c) => (
        <span dir="ltr" className="text-lg font-semibold tabular-nums">
          {CLOCK.format(new Date(c.getValue()))}
        </span>
      ),
      meta: { className: 'w-px max-sm:order-1', headClassName: 'w-px' },
    }),
    col.accessor((m) => m.lead_or_student_name ?? '', {
      id: 'who',
      header: () => t.sales.schedule.lead,
      cell: (c) => <span className="text-body font-semibold">{c.getValue() || '—'}</span>,
      meta: { className: 'max-sm:order-2 max-sm:flex-1', filter: { kind: 'text' } },
    }),
    col.accessor('teacher_name', {
      header: () => t.sales.schedule.teacher,
      meta: { className: 'text-xs text-ink-2 max-sm:order-4 max-sm:basis-full', filter: { kind: 'select', options: teachers } },
    }),
    col.display({
      id: 'enter',
      header: () => t.classroom.enter,
      cell: (c) => {
        const m = c.row.original;
        return <EnterButton lesson={{ id: m.lesson_id, starts_at: m.starts_at, ends_at: m.ends_at }} />;
      },
      meta: { className: 'w-px max-sm:order-3', headClassName: 'w-px' },
    }),
  ]);
}
