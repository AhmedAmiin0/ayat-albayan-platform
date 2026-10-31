import { RIYADH_TZ } from '@ab/shared';
import { FlatList } from 'react-native';
import { agendaDays, availabilityLine, headerLine } from '@/calendar/agenda/agenda';
import { AgendaDayView } from '@/calendar/agenda/AgendaDayView';
import { LessonDetailsSheet } from '@/calendar/details/LessonDetailsSheet';
import { useLessonDetails } from '@/calendar/details/use-lesson-details';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { PeriodSwitcher } from '@/calendar/overview/PeriodSwitcher';
import { addDays, viewerToday, weekLabel, weekStart, weekWindow } from '@/calendar/lib/week';
import { t } from '@/core/lib/i18n/i18n';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { Note } from '@/more/Note';
import { useNow } from '@/core/lib/time/use-now';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { useMyAvailability, useMyLessons, useTeacherMe } from '../lib/queries';
import { useClockCycle, useViewerTz, zoneNote } from '@/core/lib/clock';

/** A teacher has no «غيّر الميعاد» (the API never offers her `reschedule`), so the row's action is idle. */
const noMove = () => undefined;

/**
 * «جدولي» (R-TCH-03, R-SCH-08): my week السبت → الجمعة from GET /teachers/me/lessons, the same
 * day-by-day agenda as the admin's teacher calendar (my own days and clock, docs/34) with my availability as a faint line. ‹ › moves a week; offline the saved week stays. A tap
 * on a lesson opens «تفاصيل الحلقة» (its students, report state and «ادخل الحلقة»).
 */
export function TeacherScheduleScreen() {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  // The viewer's days (docs/34): week window, day buckets and clock are one zone.
  const today = viewerToday(useNow(), tz);
  const [start, setStart] = useFollowingDay(weekStart(today));
  const me = useTeacherMe();
  const lessons = useMyLessons(weekWindow(start, tz));
  const grid = useMyAvailability(me.data?.id);
  const inset = useTabBarInset();
  const details = useLessonDetails(lessons.data);
  const loaded = lessons.data !== undefined;
  const days = agendaDays(lessons.data ?? [], start, tz);
  const empty = days.every((d) => d.lessons.length === 0);
  const subtitle = headerLine([zoneNote(tz)], lessons, { cycle, tz });
  return (
    <Screen list>
      <ScreenHeader title={t.teacherNav.calendar} subtitle={subtitle} />
      <PeriodSwitcher
        label={weekLabel(start)}
        current={start === weekStart(today)}
        prevLabel={t.schedule.prevWeek}
        nextLabel={t.schedule.nextWeek}
        onPrev={() => setStart(addDays(start, -7))}
        onNext={() => setStart(addDays(start, 7))}
        onToday={() => setStart(weekStart(today))}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={loaded ? days : []}
        keyExtractor={(day) => day.date}
        extraData={cycle}
        ListHeaderComponent={loaded && empty ? <Note>{t.teacherDash.noLessonsWeek}</Note> : null}
        renderItem={({ item }) => (
          <AgendaDayView
            day={item}
            today={item.date === today}
            available={availabilityLine(grid.data ?? [], { date: item.date, teacherTz: me.data?.tz ?? RIYADH_TZ, cycle })}
            onReschedule={noMove}
            onOpen={details.open}
          />
        )}
        refreshing={lessons.isRefetching}
        onRefresh={() => {
          void lessons.refetch();
          void grid.refetch();
        }}
        ListEmptyComponent={
          lessons.isPending ? <Note>{t.common.loading}</Note> : <ErrorState onRetry={() => void lessons.refetch()} />
        }
      />
      <LessonDetailsSheet
        lesson={details.lesson}
        role="teacher"
        onClose={details.close}
        actions={(l) => <JoinClassroomButton lesson={l} />}
      />
    </Screen>
  );
}
