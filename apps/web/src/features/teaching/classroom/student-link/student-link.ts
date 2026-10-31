import type { JoinState, JoinWindow } from '@ab/shared';

/** The page's own clock against the window the API sent (its edges already count «افتح الحلقة الآن»). */
export function windowStateAt(w: Pick<JoinWindow, 'opens_at' | 'closes_at'>, now: Date): JoinState {
  const t = now.getTime();
  if (t < Date.parse(w.opens_at)) return 'early';
  return t > Date.parse(w.closes_at) ? 'closed' : 'open';
}

/** «حلقتك الآن» once the lesson has started (until it ends), «حلقتك القادمة» before. */
export const isLessonNow = (l: { starts_at: string; ends_at: string }, now: Date): boolean =>
  Date.parse(l.starts_at) <= now.getTime() && now.getTime() < Date.parse(l.ends_at);
