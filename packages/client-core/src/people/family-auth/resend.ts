// Code step resend and change-number rules, the same on web and in the apps (docs/51 §1a).

/** Resend first, then change number (or the reset's back), one centred column everywhere. */
export const CODE_STEP_ACTIONS = ['resend', 'back'] as const;
export type CodeStepAction = (typeof CODE_STEP_ACTIONS)[number];

/** The words of the resend button (`t.familyAuth` has both). */
export interface ResendWords {
  resend: string;
  resendIn: string;
}

/** The countdown's seconds left (RESEND_SECONDS after each sent code) and a request in flight. */
export interface ResendState {
  left: number;
  busy: boolean;
}

const counting = (left: number): boolean => left > 0;

/** Resend waits for the countdown and for the request (send or verify) in flight. */
export const canResend = ({ left, busy }: ResendState): boolean => !busy && !counting(left);

export const resendLabel = (left: number, words: ResendWords): string =>
  counting(left) ? words.resendIn.replace('{seconds}', String(left)) : words.resend;

/** The countdown one second on, never below zero. */
export const countdownTick = (left: number): number => Math.max(0, left - 1);
