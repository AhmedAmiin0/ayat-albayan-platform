import type { CodesSide } from '@ab/client-core';
import { t } from '../../lib/i18n/i18n';

/**
 * Which reset: staff = the staff app's «نسيت كلمة المرور؟»; family = the family app's (a student
 * code, docs/50 §6); firstTime = «أول دخول؟», a student's first password with a code sent to the
 * guardian's WhatsApp. One flow, three sets of words (as the web's ResetFlow).
 */
export type ForgotMode = 'staff' | 'family' | 'firstTime';

interface ForgotWords {
  /** Whose codes must be open: the staff flag, or the family one. */
  side: CodesSide;
  title: string;
  intro: string;
  label: string;
  hint: string | null;
  /** While that side's codes are off. */
  unavailable: string;
}

const F = () => t.familyAuth;

// Functions: `t` gets the admins' overrides after this module loads.
const WORDS: Record<ForgotMode, () => ForgotWords> = {
  staff: () => ({
    side: 'staff',
    title: F().forgotTitle,
    intro: F().forgotIntro,
    label: F().identifier,
    hint: null,
    unavailable: F().staffResetByAdmin,
  }),
  family: () => ({ ...WORDS.staff(), side: 'family', unavailable: F().familyUnavailable }),
  firstTime: () => ({
    side: 'family',
    title: F().firstTime,
    intro: F().firstTimeIntro,
    label: F().username,
    hint: F().studentUsernameHint,
    unavailable: F().familyUnavailable,
  }),
};

export const forgotWords = (mode: ForgotMode): ForgotWords => WORDS[mode]();
