import type { AttendanceKind, SalesStudentDetails, StatusStyle } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { fill } from '@/sales/sales/lib/sales-text';

export const ATTENDANCE_STYLE: Record<AttendanceKind, StatusStyle> = {
  present: { tone: 'ok', glyph: 'fill' },
  absent: { tone: 'bad', glyph: 'struck' },
  excused: { tone: 'neutral', glyph: 'struck' },
  cancelled: { tone: 'neutral', glyph: 'hollow' },
  unmarked: { tone: 'act', glyph: 'hollow' },
};

type Totals = SalesStudentDetails['attendance']['totals'];

/** The unrecorded-attendance line shows only when some day waits on it. */
export function totalsLines(totals: Totals): string[] {
  const s = t.sales.student;
  const counts = Object.fromEntries(Object.entries(totals).map(([k, n]) => [k, String(n)]));
  const lines = [fill(s.totals, counts)];
  if (totals.unmarked > 0) lines.push(fill(s.unmarkedCount, { n: String(totals.unmarked) }));
  return lines;
}
