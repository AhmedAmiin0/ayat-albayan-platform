import { statusRoute, type StatusRoute } from '@ab/client-core';
import type { CourseCardView, StudentStatus } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { courseCardQuery } from './api';

/** The dialog a status pick opens: the pause, or the stop of the current package. */
export type StatusAsk = { route: 'pause' } | { route: 'stop'; subscriptionId: string } | null;
type PickState = 'idle' | 'pending' | 'failed';

/** The status field's line: the note, «جارٍ التحميل» while the card is read, or the error. */
const HINT: Record<PickState, string> = {
  idle: t.courseCard.statusNote,
  pending: t.common.loading,
  failed: t.common.error,
};
/** The card is fresh enough when the file's panel read it a moment ago. */
const CARD_FRESH_MS = 30_000;

/**
 * Where a status pick leads (owner 2026-11-17): «موقوف مؤقتًا» opens the pause; «متوقف» reads the
 * card (the panel's copy when fresh) and opens the stop of its package, or, with no package, sets
 * the status at once as mobile does; the rest are set at once. `set` puts the pick in the field.
 */
export function useStatusPick(studentId: string) {
  const client = useQueryClient();
  const [ask, setAsk] = useState<StatusAsk>(null);
  const [state, setState] = useState<PickState>('idle');
  const decide = (card: CourseCardView | null, set: () => void) => {
    setState(card ? 'idle' : 'failed');
    const subscriptionId = card?.subscriptionId ?? null;
    if (subscriptionId) return setAsk({ route: 'stop', subscriptionId });
    if (card) set();
  };
  const stop = async (set: () => void) => {
    setState('pending');
    const query = { ...courseCardQuery({ studentId, tree: 'admin' }), staleTime: CARD_FRESH_MS };
    decide(await client.fetchQuery(query).catch(() => null), set);
  };
  const routes: Record<StatusRoute, (set: () => void) => void> = {
    set: (set) => set(),
    pause: () => setAsk({ route: 'pause' }),
    stop: (set) => void stop(set),
  };
  return {
    ask,
    hint: HINT[state],
    pending: state === 'pending',
    pick: (status: StudentStatus, set: () => void) => routes[statusRoute(status)](set),
    close: () => setAsk(null),
  };
}
