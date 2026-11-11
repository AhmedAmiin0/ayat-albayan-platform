import type { AttendanceKind, StatusStyle } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** «حضر» settled green, «غاب» struck red, «اعتذر» / «أُلغيت» neutral, «لم يُسجَّل» waits on her. */
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
