import type { AttendanceKind } from '@ab/shared';
import type { StatusStyle } from '@ab/money';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Only an unmarked lesson waits on her; present is green, absent red, the rest neutral. */
const STYLE: Record<AttendanceKind, StatusStyle> = {
  unmarked: { tone: 'act', glyph: 'hollow' },
  present: { tone: 'ok', glyph: 'fill' },
  excused: { tone: 'neutral', glyph: 'struck' },
  absent: { tone: 'bad', glyph: 'struck' },
  cancelled: { tone: 'neutral', glyph: 'hollow' },
};

/** The chip of one student's day (teacherAttendanceKind): its style and its word. */
export const attendanceChip = (kind: AttendanceKind): StatusStyle & { label: string } => ({
  ...STYLE[kind],
  label: t.sales.student.kind[kind],
});
