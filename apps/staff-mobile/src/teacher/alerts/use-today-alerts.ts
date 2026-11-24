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
import { useHolds, t, locale, notificationsListQuery } from '@ab/mobile-kit';
import { useClockCycle } from '@/core/lib/clock';
import { studentNames } from '@/today';
import { useHomePrefs } from './home-prefs';

export interface AlertRowView {
  key: string;
  line: string;
  parts: AlertParts;
  alert: TodayAlert;
}

const WORDS: AlertWords = { ...t.teacherAlerts, inMinutes: t.today.inMinutes };

/** Reads the bell's own query; its rows only with notifications.push. */
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
