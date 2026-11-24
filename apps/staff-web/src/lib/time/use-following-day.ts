import { useCallback, useState } from 'react';

/** Follows `current` until the user steps away; stepping back to it follows the clock again. */
export function useFollowingDay(current: string): [string, (next: string) => void] {
  const [other, setOther] = useState<string | null>(null);
  const pick = useCallback((next: string) => setOther(next === current ? null : next), [current]);
  // Once the clock reaches a day picked ahead, that day is today: follow the clock from there on
  // (React's adjust-state-while-rendering pattern: no effect, no extra frame).
  if (other !== null && other === current) setOther(null);
  return [other ?? current, pick];
}
