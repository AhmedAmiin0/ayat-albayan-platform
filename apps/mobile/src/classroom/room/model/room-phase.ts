import type { CamMicAnswer, RoomStatus } from './room-types';

/**
 * Why the room closed: the user left, LiveKit ended it, the staff removed them, or it opened
 * elsewhere.
 */
export type ClosedWhy = 'left' | 'ended' | 'removed' | 'duplicate';

/** The room screen's steps (docs/35 §3): explain → preview → joining → live, or failed / closed. */
export type RoomPhase =
  | { step: 'checking' }
  | { step: 'permission' }
  | { step: 'preview'; notice: 'denied' | 'blocked' | null }
  | { step: 'joining' }
  | { step: 'live' }
  | { step: 'failed'; message: string }
  | { step: 'closed'; why: ClosedWhy };

export type PhaseEvent =
  | { type: 'checked'; answer: CamMicAnswer }
  | { type: 'answered'; answer: CamMicAnswer | null }
  | { type: 'join' }
  | { type: 'joined' }
  | { type: 'failed'; message: string }
  | { type: 'status'; status: RoomStatus }
  | { type: 'leave' }
  | { type: 'retry' };

const bothGranted = (a: CamMicAnswer) => a.mic === 'granted' && a.cam === 'granted';

/**
 * The preview's notice: blocked beats denied (only the settings help); null when both were allowed.
 */
export function answerNotice(answer: CamMicAnswer | null): 'denied' | 'blocked' | null {
  if (!answer) return null;
  if (answer.mic === 'blocked' || answer.cam === 'blocked') return 'blocked';
  return bothGranted(answer) ? null : 'denied';
}

const CLOSING: Partial<Record<RoomStatus, ClosedWhy>> = {
  ended: 'ended',
  removed: 'removed',
  duplicate: 'duplicate',
};

/** Why LiveKit closed the room, from its status; undefined while the room is open. */
export const closedBy = (status: RoomStatus): ClosedWhy | undefined => CLOSING[status];

type Step = RoomPhase['step'];

interface Rule<E> {
  /** The steps the event may move from; any other step ignores it (a late or duplicate event). */
  from: readonly Step[];
  /** The step it moves to; null = stay. */
  to: (event: E) => RoomPhase | null;
}

type Rules = { [K in PhaseEvent['type']]: Rule<Extract<PhaseEvent, { type: K }>> };

const RULES: Rules = {
  checked: {
    from: ['checking'],
    to: (e) => (bothGranted(e.answer) ? { step: 'preview', notice: null } : { step: 'permission' }),
  },
  answered: {
    from: ['permission'],
    to: (e) => ({ step: 'preview', notice: answerNotice(e.answer) }),
  },
  join: { from: ['preview'], to: () => ({ step: 'joining' }) },
  joined: { from: ['joining'], to: () => ({ step: 'live' }) },
  failed: { from: ['joining'], to: (e) => ({ step: 'failed', message: e.message }) },
  // Only from live: a disconnect that follows our own «غادر» stays «left».
  status: {
    from: ['live'],
    to: (e) => {
      const why = closedBy(e.status);
      return why ? { step: 'closed', why } : null;
    },
  },
  leave: {
    from: ['checking', 'permission', 'preview', 'joining', 'live', 'failed'],
    to: () => ({ step: 'closed', why: 'left' }),
  },
  retry: { from: ['failed', 'closed'], to: () => ({ step: 'preview', notice: null }) },
};

/**
 * Pure: a step never goes back on a late event (a status after leaving, a join answer after
 * failing).
 */
export function nextPhase(phase: RoomPhase, event: PhaseEvent): RoomPhase {
  const rule = RULES[event.type] as Rule<PhaseEvent>;
  return rule.from.includes(phase.step) ? (rule.to(event) ?? phase) : phase;
}
