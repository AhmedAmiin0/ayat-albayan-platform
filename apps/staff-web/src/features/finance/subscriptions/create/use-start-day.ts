import { usedBeforeMax } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useState } from 'react';
import { usePermissions } from '@/features/people/auth';

/** Default today in Riyadh; used lessons only for a past day, capped, reset to 0 otherwise. */
export function useStartDay(lessonsTotal: number) {
  const canSet = usePermissions().can('subscriptions.set_start_date');
  // academy day (docs/34 b): the API checks starts_on / used-before against the Riyadh day
  const [today] = useState(() => riyadhToday());
  const [startsOn, setStartsOn] = useState(today);
  const [count, setCount] = useState(0);
  const shown = canSet && startsOn !== '' && startsOn < today;
  const max = usedBeforeMax(lessonsTotal);
  const value = shown ? Math.min(count, max) : 0;
  const pickDay = (day: string) => {
    setStartsOn(day);
    if (!(day < today)) setCount(0);
  };
  const extra: { lessonsUsedBefore?: number } = value > 0 ? { lessonsUsedBefore: value } : {};
  return { startsOn, pickDay, usedBefore: { shown, value, max, set: setCount }, extra };
}
