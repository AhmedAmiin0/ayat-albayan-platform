import type { PresenceText } from '@ab/shared';
import type { Locale } from '@ab/core';
import type { ClockCycle } from '@ab/time';
import { useClockCycle } from '../clock/clock-store';
import { phoneTz } from '../clock/phone-tz';
import { t } from '../i18n/i18n';
import { locale } from '../i18n/locale';
import { useNow } from '../time/use-now';

/** What presenceLine / lastMessageLine need besides the person: the viewer's clock and words. */
export interface PresenceClock {
  now: Date;
  tz: string;
  cycle: ClockCycle;
  locale: Locale;
  words: PresenceText;
}

/**
 * The relative text's inputs, in the phone's zone (phoneTz) as the thread's message times; `now`
 * ticks every minute (and on coming back to the foreground).
 */
export function usePresenceClock(): PresenceClock {
  const now = useNow();
  const cycle = useClockCycle();
  return { now, tz: phoneTz(), cycle, locale, words: t.presence };
}
