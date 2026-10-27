import { useCallback, useState } from 'react';

/**
 * The picked day of a schedule (YYYY-MM-DD) that follows the clock: while the user is on `today`
 * (or never picked a day) it moves with `today` (midnight, back from the background); a day the
 * user picked, or an `initial` day other than today, stays. Works for any period key, e.g.
 * `weekStart(today)` for a week screen.
 */
export function useFollowingDay(today: string, initial?: string): [string, (date: string) => void] {
  const [picked, setPicked] = useState<string | null>(initial && initial !== today ? initial : null);
  const setDate = useCallback((date: string) => setPicked(date === today ? null : date), [today]);
  return [picked ?? today, setDate];
}
