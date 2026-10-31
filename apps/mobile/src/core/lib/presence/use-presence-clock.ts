import type { ClockCycle, Locale, PresenceText } from '@ab/shared';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { useNow } from '@/core/lib/time/use-now';

/** What presenceLine / lastMessageLine need besides the person: the viewer's clock and words. */
export interface PresenceClock {
  now: Date;
  tz: string;
  cycle: ClockCycle;
  locale: Locale;
  words: PresenceText;
}

/** The viewer's zone (the phone's), as the channel thread's message times. */
const phoneTz = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** The relative text's inputs; `now` ticks every minute (and on coming back to the foreground). */
export function usePresenceClock(): PresenceClock {
  const now = useNow();
  const cycle = useClockCycle();
  return { now, tz: phoneTz(), cycle, locale, words: t.presence };
}
