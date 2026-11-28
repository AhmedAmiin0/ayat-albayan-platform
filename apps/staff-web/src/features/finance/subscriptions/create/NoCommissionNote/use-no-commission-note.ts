import { useState } from 'react';
import { subscriptionAlreadyStarted } from '@ab/money';
import type { NoCommissionNoteProps } from './NoCommissionNote.types';

/** Course started before signup (migration 20261028000942) means no commission. */
export function useNoCommissionNote({ startsOn, usedBefore, now }: NoCommissionNoteProps) {
  const [mountedAt] = useState(() => new Date());
  return subscriptionAlreadyStarted({
    starts_on: startsOn,
    created_at: (now ?? mountedAt).toISOString(),
    lessons_used_before: usedBefore,
  });
}
