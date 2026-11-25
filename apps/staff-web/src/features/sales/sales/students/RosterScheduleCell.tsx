import type { SalesStudentView } from '@ab/shared';
import { useClock, viewerZone } from '@ab/web-kit';
import { rosterScheduleLine } from './roster-text';

/** In the viewer's zone and 12/24 h. */
export function RosterScheduleCell({ student }: { student: Pick<SalesStudentView, 'weekly'> }) {
  const clock = useClock();
  const line = rosterScheduleLine(student, clock, viewerZone());
  return line ? <span className="text-sm text-ink-2">{line}</span> : null;
}
