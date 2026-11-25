import { usedBeforeMax } from '@ab/shared';
import { useState } from 'react';
import { usePermissions } from '@ab/web-kit';
import { todayIn } from '@/features/finance/subscriptions';
import type { StartValue } from './SalesStartField';

/** The package's first day and the lessons already used, for a package of `lessonsTotal`. */
export function useSubscribeStart(lessonsTotal: number) {
  const canSet = usePermissions().can('subscriptions.set_start_date');
  // The API checks starts_on and used-before against the academy's day (docs/34 b).
  const [today] = useState(() => todayIn('Asia/Riyadh'));
  const [start, setStart] = useState<StartValue>({
    startsOn: today,
    alreadyStarted: false,
    usedBefore: 0,
  });
  const [error, setError] = useState<string | null>(null);
  // A smaller package clamps the lessons used before to every lesson but one.
  const usedMax = usedBeforeMax(lessonsTotal);
  const shown = { ...start, usedBefore: Math.min(start.usedBefore, usedMax) };
  const patch = (p: Partial<StartValue>) => {
    setStart((v) => ({ ...v, ...p }));
  };
  return { canSet, today, shown, usedMax, patch, error, setError };
}
