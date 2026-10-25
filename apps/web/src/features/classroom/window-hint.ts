import { canJoinNow, DEFAULT_JOIN_WINDOW, joinWindow, type JoinWindowConfig, type WindowLesson } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

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

/** The «ادخل الحلقة» rule shared by every button: the settings' window (15 min before to 2 h after by default). */
export function joinHint(lesson: WindowLesson, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): JoinHint {
  if (canJoinNow(lesson, now, win)) return { canJoin: true, hint: null };
  const w = joinWindow(lesson, now, win);
  return { canJoin: false, hint: w.state === 'early' ? opensAtText(w.opens_at) : t.classroom.closedHint };
}
