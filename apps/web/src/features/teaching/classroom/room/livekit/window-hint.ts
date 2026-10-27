import { canJoinNow, clockOf, DEFAULT_JOIN_WINDOW, joinWindow, type ClockCycle, type JoinWindowConfig, type WindowLesson } from '@ab/shared';
import { clockCycle } from '@/lib/clock';
import { viewerZone } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

/**
 * «تفتح الساعة 17:45» / «5:45 م» in the viewer's own zone and cycle (Western digits). A refusal's
 * line reads the cycle in effect when it is shown (clockCycle()); buttons pass theirs (useClock).
 */
export function opensAtText(iso: string, cycle: ClockCycle = clockCycle()): string {
  return t.classroom.opensAt.replace('{time}', clockOf(new Date(iso), { tz: viewerZone(), cycle, locale }));
}

export interface JoinHint {
  canJoin: boolean;
  /** Why it is disabled; null when open. */
  hint: string | null;
}

/** The «ادخل الحلقة» rule shared by every button: the settings' window (15 min before to 2 h after by default). */
export function joinHint(lesson: WindowLesson, now: Date, opts: { win?: JoinWindowConfig; cycle?: ClockCycle } = {}): JoinHint {
  const win = opts.win ?? DEFAULT_JOIN_WINDOW;
  if (canJoinNow(lesson, now, win)) return { canJoin: true, hint: null };
  const w = joinWindow(lesson, now, win);
  return { canJoin: false, hint: w.state === 'early' ? opensAtText(w.opens_at, opts.cycle) : t.classroom.closedHint };
}
