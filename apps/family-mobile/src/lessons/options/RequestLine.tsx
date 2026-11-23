import { confirmedLine, excusedLine, requestChip } from '@ab/client-core';
import { type PortalLesson } from '@ab/shared';
import { clockOf, dateText, type ClockOptions } from '@ab/time';
import { AppText, t, type } from '@ab/mobile-kit';

interface RequestLineProps {
  lesson: PortalLesson;
  /** The student's clock. */
  clock: ClockOptions;
  /** The words' colour (white on the lapis card, ink-2 on a row). */
  ink: string;
  now: Date;
  /** The student's name: «أكّدتم حضور يوسف لهذه الحلقة». */
  student: string;
}

const A = () => t.portal.actions;

/** «طلبتم الثلاثاء 18 نوفمبر، 5:30 م». */
const askedText = (iso: string, clock: ClockOptions): string => {
  const at = new Date(iso);
  const day = dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
  return A().requestedLine.replace('{when}', `${day}${t.common.listSeparator}${clockOf(at, clock)}`);
};

/** «أكّدتم حضور يوسف لهذه الحلقة» on a confirmed lesson, else null. */
const confirmedText = ({ lesson, now, student }: RequestLineProps): string | null =>
  confirmedLine(lesson, now) ? A().confirmedLine.replace('{student}', student) : null;

/**
 * What the family's request or excuse left: asked, declined (with the note), excused, or the
 * attendance they confirmed.
 */
function lineOf(props: RequestLineProps): string | null {
  const { lesson, clock } = props;
  const request = lesson.family?.request;
  const chip = requestChip(lesson);
  const excused = excusedLine(lesson);
  if (excused) return A()[excused];
  if (!request || !chip) return confirmedText(props);
  if (chip === 'pendingChip') return askedText(request.proposed_starts_at, clock);
  const note = request.decision_note && A().decisionNote.replace('{note}', request.decision_note);
  return [A().rejectedChip, note].filter(Boolean).join(' · ');
}

export function RequestLine(props: RequestLineProps) {
  const line = lineOf(props);
  if (!line) return null;
  return <AppText style={{ fontSize: type.size.xs, color: props.ink }}>{line}</AppText>;
}
