import type { AttendanceTableRow } from '@ab/shared';
import { DataTable } from '@/components/data-table/DataTable';
import { attendanceColumns } from '@/features/teaching/teacher-board';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';

export interface UpcomingLessonsProps {
  /** Her lessons with the student in the next 14 days, cancelled and moved ones included. */
  rows: AttendanceTableRow[];
  studentId: string;
  tz: string;
}

/**
 * «الحلقات القادمة خلال 14 يومًا» (docs/47): the log's columns over the coming lessons, so a
 * cancel shows its reason and a move its new time; the chip reads the lesson's status.
 */
export function UpcomingLessons({ rows, studentId, tz }: UpcomingLessonsProps) {
  const clock = useClock();
  return (
    <section className="mb-6 grid gap-2">
      <h2 className="font-display text-h3 font-bold">{t.teacherFile.upcoming}</h2>
      <DataTable
        stacked
        label={t.teacherFile.upcoming}
        columns={attendanceColumns({ clock: { ...clock, tz }, studentId })}
        data={rows}
        getRowId={(r) => r.lesson_id}
        emptyText={t.teacherFile.noUpcoming}
      />
    </section>
  );
}
