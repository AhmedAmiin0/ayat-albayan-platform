import { alertLine, alertParts, type AlertParts, type AlertWords, todayAlerts } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/people/auth';
import { notificationsQuery } from '@/features/messaging/notifications';
import { studentNames } from '@/features/teaching/schedule';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { useHomePrefs } from './home-prefs';

export interface AlertRowView {
  key: string;
  line: string;
  parts: AlertParts;
  /** The lesson to open or report on; null for a bell row. */
  lessonId: string | null;
  /** The bell row to mark read; null for a lesson. */
  bellId: string | null;
}

const WORDS: AlertWords = { ...t.teacherAlerts, inMinutes: t.today.inMinutes };

/**
 * «تنبيهات اليوم» (owner 2026-11-14) from the home's lessons and the bell's own query (the same
 * GET /me/notifications as the header bell, read only when she holds notifications.push).
 */
export function useTodayAlerts(o: { lessons: readonly LessonView[]; now: Date; tz: string }) {
  const prefs = useHomePrefs();
  const clock = useClock();
  const allowed = usePermissions().can('notifications.push');
  const bell = useQuery({ ...notificationsQuery, enabled: allowed }).data?.items ?? [];
  const alerts = todayAlerts({ ...o, bell, shown: prefs.alerts });
  const opts = { clock: { ...clock, tz: o.tz }, names: studentNames };
  return alerts.map((alert): AlertRowView => {
    const parts = alertParts(alert, opts);
    const bellRow = alert.kind === 'bell';
    return {
      key: alert.key,
      line: alertLine(parts, WORDS),
      parts,
      lessonId: bellRow ? null : alert.lesson.id,
      bellId: bellRow ? alert.item.id : null,
    };
  });
}
