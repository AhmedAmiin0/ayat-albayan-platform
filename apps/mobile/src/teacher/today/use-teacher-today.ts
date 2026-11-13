import { deviceTimeZone } from '@ab/shared';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { usePullRefresh } from '@/core/lib/query/pull-refresh';
import { useNow } from '@/core/lib/time/use-now';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { clockAt } from '@/inbox';
import { aheadWindow } from '@/teacher/lib/day';
import { useMyLessons, usePendingReports } from '@/teacher/lib/queries';
import { localDate } from '@/today';
import { teacherDateLine } from './header-line';
import { teacherDay } from './teacher-day';

/**
 * «اليوم»'s reads (docs/48): ONE padded aheadWindow lessons query and the pending reports, each
 * polled every 30 s only while the screen is in front; the pull spins for her own pull only.
 */
export function useTeacherToday() {
  const now = useNow();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const focused = useScreenFocused();
  const date = localDate(now, tz);
  const ahead = useMyLessons(aheadWindow(date), focused);
  const pending = usePendingReports(focused);
  const pull = usePullRefresh(() => Promise.all([ahead.refetch(), pending.refetch()]));
  const loaded = ahead.data !== undefined;
  // Offline: the saved day stays on screen with how old it is (R-MOB-03).
  const updated = clockAt(ahead.dataUpdatedAt, cycle, tz);
  return {
    now,
    ahead,
    pending,
    pull,
    day: teacherDay({ lessons: ahead.data, pending: pending.data, date, tz, now }),
    dateLine: teacherDateLine(now, { viewer: tz, device: deviceTimeZone() ?? tz }),
    stale: ahead.isError && loaded ? t.mobile.lastUpdated.replace('{time}', updated) : undefined,
    pendingFailed: pending.isError && pending.data === undefined,
  };
}
