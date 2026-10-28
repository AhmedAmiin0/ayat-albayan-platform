import { riyadhToday, usedBeforeMax } from '@ab/shared';
import { useState } from 'react';
import { usePermissions } from '@/features/people/auth';

/**
 * The admin's first day (default today, Riyadh) and «حلقات مستخدمة من الباقة» (owner 2026-10-28): asked
 * only for a day before today with subscriptions.set_start_date, clamped to every lesson but one of the
 * package; moving the day to today or later puts it back to 0. `extra` is what the body adds (> 0 only).
 */
export function useStartDay(lessonsTotal: number) {
  const canSet = usePermissions().can('subscriptions.set_start_date');
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
