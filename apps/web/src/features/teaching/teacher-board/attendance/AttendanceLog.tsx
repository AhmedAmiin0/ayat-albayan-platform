import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Select } from '@/components/ui/form/select';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { attendanceColumns } from './attendance-columns';
import { monthLabel, totalsLine } from './attendance-text';
import { useTeacherAttendance } from './use-teacher-attendance';

export interface AttendanceLogProps {
  studentId: string;
  /** Her zone (the board's one zone). */
  tz: string;
}

/**
 * «سجل الحضور» of one student (docs/46 C5): her own lessons with the student, a month at a time
 * (newest first), the month's totals, then a compact table.
 */
export function AttendanceLog({ studentId, tz }: AttendanceLogProps) {
  const w = t.sales.student.log;
  const clock = useClock();
  const [month, setMonth] = useState<string | null>(null);
  const log = useTeacherAttendance(studentId, month);
  if (log.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!log.data) return <ListSkeleton />;
  const data = log.data;
  return (
    <section aria-label={t.teacherBoard.attendanceLog} className="grid gap-3">
      <Field label={w.months}>
        {(p) => (
          <Select {...p} value={month ?? data.month} onChange={(e) => setMonth(e.target.value)}>
            {data.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <p role="note" className="text-sm font-semibold">{totalsLine(data.totals)}</p>
      <DataTable
        stacked
        label={t.teacherBoard.attendanceLog}
        columns={attendanceColumns({ ...clock, tz })}
        data={data.items}
        getRowId={(r) => r.lesson_id}
        emptyText={w.empty}
      />
    </section>
  );
}
