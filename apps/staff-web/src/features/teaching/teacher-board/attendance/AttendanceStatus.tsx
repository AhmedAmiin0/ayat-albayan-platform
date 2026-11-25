import type { AttendanceKind, AttendanceTableRow } from '@ab/shared';
import { StatusChip, useLessonStatusText } from '@ab/web-kit';
import { attendanceChip } from '@/features/teaching/teacher-board/cells/attendance-style';

/** The student's own day (not a cancelled or moved lesson, which read by their status). */
const ownDay = (kind: AttendanceKind | null): kind is Exclude<AttendanceKind, 'cancelled'> =>
  kind !== null && kind !== 'cancelled';

export function AttendanceStatus({ row }: { row: Pick<AttendanceTableRow, 'kind' | 'status'> }) {
  const status = useLessonStatusText();
  const chip = ownDay(row.kind) ? attendanceChip(row.kind) : status.chip(row.status);
  return <StatusChip size="sm" {...chip} />;
}
