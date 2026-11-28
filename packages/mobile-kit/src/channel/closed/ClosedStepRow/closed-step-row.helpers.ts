import { t } from '../../../lib/i18n/i18n';
import type { ClosedStep } from '@ab/client-core';

export const noteOf = (step: ClosedStep): string => {
  const c = t.studentChannel.closedCard;
  return step.state === 'done' ? c.done : c.notes[step.key];
};

/** The row as one screen-reader phrase: its name, «current» when it is, then its note. */
export const stepLabel = (step: ClosedStep): string => {
  const c = t.studentChannel.closedCard;
  const current = step.state === 'current' ? c.current : '';
  return [c.steps[step.key], current, noteOf(step)].filter(Boolean).join('، ');
};
