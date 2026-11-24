import { canJoinNow, clockOf, DEFAULT_JOIN_WINDOW, joinWindow, type ClockCycle, type JoinWindowConfig, type WindowLesson } from '@ab/shared';
import { viewerZone } from '@ab/web-kit/lib/clock-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

/** Callers pass the cycle they rendered with (useClock), so a format switch re-renders it. */
export function opensAtText(iso: string, cycle: ClockCycle): string {
  return t.classroom.opensAt.replace('{time}', clockOf(new Date(iso), { tz: viewerZone(), cycle, locale }));
}

export interface JoinHint {
  canJoin: boolean;
  /** Why it is disabled; null when open. */
  hint: string | null;
}

/** The join rule shared by every button: 15 min before to 2 h after by default. */
export function joinHint(lesson: WindowLesson, now: Date, opts: { win?: JoinWindowConfig; cycle: ClockCycle }): JoinHint {
  const win = opts.win ?? DEFAULT_JOIN_WINDOW;
  if (canJoinNow(lesson, now, win)) return { canJoin: true, hint: null };
  const w = joinWindow(lesson, now, win);
  return { canJoin: false, hint: w.state === 'early' ? opensAtText(w.opens_at, opts.cycle) : t.classroom.closedHint };
}
