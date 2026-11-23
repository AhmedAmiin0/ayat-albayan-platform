import type { CodesSide } from '@ab/client-core';
import { t } from '../../lib/i18n/i18n';

/** One flow, three word sets; firstTime sends the code to the guardian's WhatsApp (docs/50 §6). */
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
