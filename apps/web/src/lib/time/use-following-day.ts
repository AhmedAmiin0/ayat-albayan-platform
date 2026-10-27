import { useCallback, useState } from 'react';

/**
 * A page's picked period (a day or a week start) that follows `current` while nothing else is
 * picked: past midnight, or with the tab shown again, «هذا الأسبوع» moves on by itself; a period
 * the user stepped to stays. Stepping back to `current` follows the clock again.
 */
export function useFollowingDay(current: string): [string, (next: string) => void] {
  const [other, setOther] = useState<string | null>(null);
  const pick = useCallback((next: string) => setOther(next === current ? null : next), [current]);
  return [other ?? current, pick];
}
