import { excusedLine, requestChip } from '@ab/client-core';
import { clockOf, dateText, type ClockOptions, type PortalLesson } from '@ab/shared';
import { AppText, t, type } from '@ab/mobile-kit';

interface RequestLineProps {
  lesson: PortalLesson;
  /** The student's clock. */
  clock: ClockOptions;
  /** The words' colour (white on the lapis card, ink-2 on a row). */
  ink: string;
}

const A = () => t.portal.actions;

/** «طلبتم الثلاثاء 18 نوفمبر، 5:30 م». */
const askedText = (iso: string, clock: ClockOptions): string => {
  const at = new Date(iso);
  const day = dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
  return A().requestedLine.replace('{when}', `${day}${t.common.listSeparator}${clockOf(at, clock)}`);
};

/** What the family's request or excuse left: asked, declined (with the note), or excused. */
function lineOf(lesson: PortalLesson, clock: ClockOptions): string | null {
  const request = lesson.family?.request;
  const chip = requestChip(lesson);
  const excused = excusedLine(lesson);
  if (excused) return A()[excused];
  if (!request || !chip) return null;
  if (chip === 'pendingChip') return askedText(request.proposed_starts_at, clock);
  const note = request.decision_note && A().decisionNote.replace('{note}', request.decision_note);
  return [A().rejectedChip, note].filter(Boolean).join(' · ');
}

export function RequestLine({ lesson, clock, ink }: RequestLineProps) {
  const line = lineOf(lesson, clock);
  if (!line) return null;
  return <AppText style={{ fontSize: type.size.xs, color: ink }}>{line}</AppText>;
}
