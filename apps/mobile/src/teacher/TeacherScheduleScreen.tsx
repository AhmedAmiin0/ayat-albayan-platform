import { RIYADH_TZ } from '@ab/shared';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { agendaDays, availabilityLine, headerLine } from '@/calendar/agenda';
import { AgendaDayView } from '@/calendar/AgendaDayView';
import { PeriodSwitcher } from '@/calendar/PeriodSwitcher';
import { addDays, riyadhToday, weekLabel, weekStart, weekWindow } from '@/calendar/week';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { useNow } from '@/today/use-day-lessons';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { useMyAvailability, useMyLessons, useTeacherMe } from './queries';

/** A teacher has no «غيّر الميعاد» (the API never offers her `reschedule`), so the row's action is idle. */
const noMove = () => undefined;

/**
 * «جدولي» (R-TCH-03, R-SCH-08): my week السبت → الجمعة from GET /teachers/me/lessons, the same
 * day-by-day agenda as the admin's teacher calendar (Riyadh time, my clock beside it when it
 * differs) with my availability as a faint line. ‹ › moves a week; offline the saved week stays.
 */
export function TeacherScheduleScreen() {
  const today = riyadhToday(useNow());
  const [start, setStart] = useState(() => weekStart(today));
  const me = useTeacherMe();
  const lessons = useMyLessons(weekWindow(start));
  const grid = useMyAvailability(me.data?.id);
  const inset = useTabBarInset();
  const loaded = lessons.data !== undefined;
  const days = agendaDays(lessons.data ?? [], start);
  const empty = days.every((d) => d.lessons.length === 0);
  const subtitle = headerLine([t.availability.tzHint.replace('{tz}', t.runningHead.riyadh)], lessons);
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
        ListHeaderComponent={loaded && empty ? <Note>{t.teacherDash.noLessonsWeek}</Note> : null}
        renderItem={({ item }) => (
          <AgendaDayView
            day={item}
            today={item.date === today}
            available={availabilityLine(grid.data ?? [], item.date, me.data?.tz ?? RIYADH_TZ)}
            onReschedule={noMove}
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
    </Screen>
  );
}
