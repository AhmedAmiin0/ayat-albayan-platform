import type { SalesStudentView } from '@ab/shared';
import { useClock } from '@/lib/clock';
import { viewerZone } from '@/lib/clock-text';
import { rosterScheduleLine } from './roster-text';

/** A «كل الطلاب» row's weekly schedule in the viewer's zone and 12 / 24 h (owner 2026-10-30). */
export function RosterScheduleCell({ student }: { student: Pick<SalesStudentView, 'weekly'> }) {
  const clock = useClock();
  const line = rosterScheduleLine(student, clock, viewerZone());
  return line ? <span className="text-sm text-ink-2">{line}</span> : null;
}
