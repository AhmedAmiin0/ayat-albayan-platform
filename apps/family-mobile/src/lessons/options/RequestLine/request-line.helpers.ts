import { confirmedLine, excusedLine, requestChip } from '@ab/client-core';
import { clockOf, dateText, type ClockOptions } from '@ab/time';
import { t } from '@ab/mobile-kit';
import type { RequestLineProps } from './RequestLine.types';

export const A = () => t.portal.actions;

export const askedText = (iso: string, clock: ClockOptions): string => {
  const at = new Date(iso);
  const day = dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
  return A().requestedLine.replace(
    '{when}',
    `${day}${t.common.listSeparator}${clockOf(at, clock)}`,
  );
};

/** Null unless the lesson is confirmed. */
export const confirmedText = ({ lesson, now, student }: RequestLineProps): string | null =>
  confirmedLine(lesson, now) ? A().confirmedLine.replace('{student}', student) : null;

/**
 * What the family's request or excuse left: asked, declined (with the note), excused, or the
 * attendance they confirmed.
 */
export function lineOf(props: RequestLineProps): string | null {
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
