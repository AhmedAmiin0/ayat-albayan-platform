import type { AttendanceKind, AttendanceTableRow } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { useLessonStatusText } from '@/lib/settings/lesson-status-text';
import { attendanceChip } from '@/features/teaching/teacher-board/cells/attendance-style';

/** The student's own day (not a cancelled or moved lesson, which read by their status). */
const ownDay = (kind: AttendanceKind | null): kind is Exclude<AttendanceKind, 'cancelled'> =>
  kind !== null && kind !== 'cancelled';

/**
 * A row's chip: the student's day as «الحضور» says it; a cancelled or moved lesson by its status
 * (who cancelled it), in the academy's words for the statuses.
 */
export function AttendanceStatus({ row }: { row: Pick<AttendanceTableRow, 'kind' | 'status'> }) {
  const status = useLessonStatusText();
  const chip = ownDay(row.kind) ? attendanceChip(row.kind) : status.chip(row.status);
  return <StatusChip size="sm" {...chip} />;
}
