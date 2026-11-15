import { useState } from 'react';
import { useNow } from './use-now';

/**
 * A Date that changes only when the device's calendar day does (useNow underneath: a minute timer
 * and the foreground refresh). A list's day words («أمس», the weekday) switch at midnight, while
 * the minute ticks between redraw no row (React's adjust-state-while-rendering pattern).
 */
export function useToday(): Date {
  const now = useNow();
  const [today, setToday] = useState(now);
  if (now.toDateString() !== today.toDateString()) setToday(now);
  return now.toDateString() === today.toDateString() ? today : now;
}
