import { todaySchedule } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { AppText, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { useChildrenLessons, useFamilyClock } from '@/portal';
import { ScheduleDay } from '@/schedule';

/** The join button lights up within a few seconds of the window (as on «الجدول»). */
const TICK_MS = 5000;

/**
 * «اليوم» on a guardian's home: today's lessons still ahead across every child, on this phone's
 * clock, each naming the child with «ادخل» once it opens; «لا توجد حلقات اليوم» when none.
 * The reads are the child cards' own (one query per child, shared cache).
 */
export function TodayLessons({ students }: { students: readonly PortalStudent[] }) {
  const { color } = useTheme();
  const reads = useChildrenLessons(students);
  const clock = useFamilyClock();
  const now = useNow(TICK_MS);
  if (reads.loading || reads.failed) return null;
  const today = todaySchedule({ children: reads.children, tz: clock.tz }, now);
  if (today) return <ScheduleDay day={today} clock={clock} now={now} named />;
  return (
    <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
      {t.portal.app.home.noToday}
    </AppText>
  );
}
