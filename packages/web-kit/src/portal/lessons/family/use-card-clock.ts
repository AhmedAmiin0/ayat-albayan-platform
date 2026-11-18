import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useClock } from '@ab/web-kit/lib/clock';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { viewerLine } from './lesson-text';

/** The countdown ticks every second; the join button turns on by itself at the window. */
const TICK_MS = 1_000;

/**
 * A family lesson card's clock: `now` (ticking), the viewer's 12 / 24 h cycle on the student's
 * zone, and the start on the viewer's own clock when it reads differently there (else null).
 */
export function useCardClock(lesson: PortalLesson, student: PortalStudent) {
  const now = useNow(TICK_MS);
  const clock = { ...useClock(), tz: student.tz };
  const viewer = viewerLine(lesson.starts_at, clock, useViewerTz());
  return { now, clock, viewer };
}
