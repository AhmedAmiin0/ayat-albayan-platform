import { RIYADH_TZ } from '@ab/time';
import { addDays, agendaDays, useLessonDetails, viewerToday, weekStart, weekWindow } from '@/calendar';
import { useViewerTz } from '@/core/lib/clock';
import { usePullRefresh, useScreenFocused, useNow } from '@ab/mobile-kit';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { useMyAvailability, useMyLessons, useTeacherMe } from '@/teacher/lib/queries';

/** Her week in her own days (docs/34), polled every 30 s while in front (docs/48). */
export function useScheduleWeek() {
  const tz = useViewerTz();
  const today = viewerToday(useNow(), tz);
  const [start, setStart] = useFollowingDay(weekStart(today));
  const me = useTeacherMe();
  const lessons = useMyLessons(weekWindow(start, tz), useScreenFocused());
  const grid = useMyAvailability(me.data?.id);
  const days = agendaDays(lessons.data ?? [], start, tz);
  return {
    tz,
    today,
    start,
    lessons,
    grid: grid.data ?? [],
    teacherTz: me.data?.tz ?? RIYADH_TZ,
    days,
    empty: days.every((d) => d.lessons.length === 0),
    details: useLessonDetails(lessons.data),
    pull: usePullRefresh(() => Promise.all([lessons.refetch(), grid.refetch()])),
    step: (by: number) => setStart(addDays(start, by * 7)),
    toThisWeek: () => setStart(weekStart(today)),
  };
}
