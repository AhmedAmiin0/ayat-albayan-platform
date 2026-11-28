import { t } from '../../../lib/i18n/i18n';
import type { ClosedStep } from '@ab/client-core';

export const noteOf = (step: ClosedStep): string => {
  const c = t.studentChannel.closedCard;
  return step.state === 'done' ? c.done : c.notes[step.key];
};
