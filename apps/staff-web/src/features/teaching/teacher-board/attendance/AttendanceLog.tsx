import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { attendanceColumns } from './attendance-columns';
import { monthLabel, totalsLine } from './attendance-text';
import { useTeacherAttendance } from './use-teacher-attendance';

export interface AttendanceLogProps {
  studentId: string;
  /** Her zone (the board's one zone). */
  tz: string;
}

/** Her own lessons with the student, a month at a time, newest first (docs/46 C5). */
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
        columns={attendanceColumns({ clock: { ...clock, tz }, studentId })}
        data={data.items}
        getRowId={(r) => r.lesson_id}
        emptyText={w.empty}
      />
    </section>
  );
}
