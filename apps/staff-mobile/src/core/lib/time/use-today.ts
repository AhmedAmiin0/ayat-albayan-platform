import { useState } from 'react';
import { useNow } from '@ab/mobile-kit';

/** Changes only on a calendar-day change, so minute ticks redraw no row. */
export function useToday(): Date {
  const now = useNow();
  const [today, setToday] = useState(now);
  if (now.toDateString() !== today.toDateString()) setToday(now);
  return now.toDateString() === today.toDateString() ? today : now;
}
