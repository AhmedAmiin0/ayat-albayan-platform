import type { ChannelClosedReason } from '@ab/shared';

// The closed chat's steps (ChatXClosed): what is left before the chat opens by itself.

export type StepKey = 'subscribe' | 'teacher' | 'open';
export type StepState = 'done' | 'current' | 'pending';

export interface ClosedStep {
  key: StepKey;
  state: StepState;
}

const KEYS: readonly StepKey[] = ['subscribe', 'teacher', 'open'];

/** The step each reason is at; the chat switched off for the family has no steps. */
const CURRENT: Readonly<Record<ChannelClosedReason, number | null>> = {
  not_subscribed: 0,
  no_teacher: 1,
  family_chat_off: null,
};

/** Before the current step: done; after it: still to come. */
const STATE: Readonly<Record<number, StepState>> = { [-1]: 'done', 0: 'current', 1: 'pending' };

/** The three steps and where the student is, or none (family_chat_off: the title only). */
export function closedSteps(reason: ChannelClosedReason): ClosedStep[] {
  const current = CURRENT[reason];
  if (current === null) return [];
  return KEYS.map((key, i) => ({ key, state: STATE[Math.sign(i - current)] ?? 'pending' }));
}
