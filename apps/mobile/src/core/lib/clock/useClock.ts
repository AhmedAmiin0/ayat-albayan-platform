import type { ClockCycle, Locale } from '@ab/shared';
import { useMemo } from 'react';
import { locale } from '@/core/lib/i18n/locale';
import { useClockCycle } from './clock-store';

/** `{ cycle, locale }` for the shared clock formatters (clockOf, clockOfHhmm, clockRange). */
export function useClock(): { cycle: ClockCycle; locale: Locale } {
  const cycle = useClockCycle();
  return useMemo(() => ({ cycle, locale }), [cycle]);
}
