// The code step's resend and «غيّر الرقم» rules, the same on the web and in the apps (docs/51 §1a).

/**
 * The actions under «تحقّق», in this order on every code step: «أعد إرسال الرمز», then «غيّر الرقم»
 * (or the reset's «رجوع»), one centred column (side by side, an English
 * pair wrapped unevenly).
 */
export const CODE_STEP_ACTIONS = ['resend', 'back'] as const;
export type CodeStepAction = (typeof CODE_STEP_ACTIONS)[number];

/** The words of the resend button (`t.familyAuth` has both). */
export interface ResendWords {
  /** «أعد إرسال الرمز». */
  resend: string;
  /** «يمكنك إعادة الإرسال بعد {seconds} ث». */
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

/** «يمكنك إعادة الإرسال بعد 42 ث» while the countdown runs, then «أعد إرسال الرمز». */
export const resendLabel = (left: number, words: ResendWords): string =>
  counting(left) ? words.resendIn.replace('{seconds}', String(left)) : words.resend;

/** The countdown one second on, never below zero. */
export const countdownTick = (left: number): number => Math.max(0, left - 1);
