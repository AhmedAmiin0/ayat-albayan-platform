import { canJoinNow, joinWindow } from '@ab/shared';
import { t } from '@/lib/i18n';

const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** «بتفتح الساعة 17:45» in the viewer's own zone (Western digits). */
export function opensAtText(iso: string): string {
  return t.classroom.opensAt.replace('{time}', CLOCK.format(new Date(iso)));
}

export interface JoinHint {
  canJoin: boolean;
  /** Why it is disabled; null when open. */
  hint: string | null;
}

/** The «ادخل الحلقة» rule shared by every button: open from 15 min before to 2 h after. */
export function joinHint(lesson: { starts_at: string; ends_at: string }, now: Date): JoinHint {
  if (canJoinNow(lesson, now)) return { canJoin: true, hint: null };
  const w = joinWindow(lesson, now);
  return { canJoin: false, hint: w.state === 'early' ? opensAtText(w.opens_at) : t.classroom.closedHint };
}
