import {
  alertLine,
  alertParts,
  type AlertParts,
  type AlertWords,
  type TodayAlert,
  todayAlerts,
} from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useHolds } from '@/core/auth/use-permissions';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { notificationsListQuery } from '@/notifications';
import { studentNames } from '@/today';
import { useHomePrefs } from './home-prefs';

export interface AlertRowView {
  key: string;
  line: string;
  parts: AlertParts;
  alert: TodayAlert;
}

const WORDS: AlertWords = { ...t.teacherAlerts, inMinutes: t.today.inMinutes };

/**
 * «تنبيهات اليوم» (owner 2026-11-14) from «اليوم»'s lessons and the bell's own query (the same
 * GET /me/notifications as the bell; its rows only once she holds notifications.push).
 */
export function useTodayAlerts(o: { lessons: readonly LessonView[]; now: Date; tz: string }) {
  const prefs = useHomePrefs();
  const cycle = useClockCycle();
  const held = useHolds('notifications.push');
  const bell = useQuery({ ...notificationsListQuery, enabled: held }).data?.items ?? [];
  const alerts = todayAlerts({ ...o, bell, shown: prefs.alerts });
  const opts = { clock: { tz: o.tz, cycle, locale }, names: studentNames };
  return alerts.map((alert): AlertRowView => {
    const parts = alertParts(alert, opts);
    return { key: alert.key, line: alertLine(parts, WORDS), parts, alert };
  });
}
