import { RIYADH_TZ } from '@ab/shared';
import { addDays, agendaDays, useLessonDetails, viewerToday, weekStart, weekWindow } from '@/calendar';
import { useViewerTz } from '@/core/lib/clock';
import { usePullRefresh } from '@/core/lib/query/pull-refresh';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { useNow } from '@/core/lib/time/use-now';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { useMyAvailability, useMyLessons, useTeacherMe } from '@/teacher/lib/queries';

/**
 * The week view's reads (docs/48): her week in her own days (docs/34), polled every 30 s while
 * «جدولي» is in front, and her availability for the faint line; the spinner only for her pull.
 */
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
