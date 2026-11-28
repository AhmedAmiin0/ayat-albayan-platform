import type { Locale } from '@ab/core';
import type { ClockCycle } from '@ab/time';
import { locale } from './i18n/locale';

// The web shows 12-hour times only: a saved «ab.clock» value or a 24-hour locale is ignored.
// The phones keep their own 12/24 h setting.
const WEB_CYCLE: ClockCycle = '12';

/** The cycle every web screen formats with, for code outside React. */
export function clockCycle(): ClockCycle {
  return WEB_CYCLE;
}

/** What a screen formats times with: the cycle in effect and the UI language. */
export interface Clock {
  cycle: ClockCycle;
  locale: Locale;
}

const WEB_CLOCK: Clock = { cycle: WEB_CYCLE, locale };

/** `{ cycle, locale }` for the shared clock formatters (clockOf, clockOfHhmm, clockRange). */
export function useClock(): Clock {
  return WEB_CLOCK;
}
