import { RIYADH_TZ, type LessonView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { RescheduleSheet } from '@/reschedule/RescheduleSheet';
import { useNow } from '@/today/use-day-lessons';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { agendaDays, availabilityLine, headerLine } from './agenda';
import { AgendaDayView } from './AgendaDayView';
import { PeriodSwitcher } from './PeriodSwitcher';
import { useAvailability, useTeacher, useWeekLessons } from './queries';
import { addDays, riyadhToday, weekLabel, weekStart, weekWindow } from './week';

/**
 * «جدول المعلم/ة» (R-TCH-02, R-SCH-01): one teacher's week, السبت → الجمعة, as a day-by-day agenda
 * in Riyadh time with the teacher's own clock beside it when it differs, and each day's
 * availability as a faint line. ‹ › moves a week; a lesson's «غيّر الميعاد» opens the reschedule
 * sheet. Pull to refresh; offline the saved week stays with its «آخر تحديث».
 */
export function TeacherCalendarScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const today = riyadhToday(useNow());
  const [start, setStart] = useState(() => weekStart(today));
  const lessons = useWeekLessons({ ...weekWindow(start), teacherId: id });
  const teacher = useTeacher(id);
  const grid = useAvailability(id);
  const [moving, setMoving] = useState<LessonView | null>(null);
  const loaded = lessons.data !== undefined;
  const days = agendaDays(lessons.data ?? [], start);
  const empty = days.every((d) => d.lessons.length === 0);
  const tzLine = t.availability.tzHint.replace('{tz}', t.runningHead.riyadh);
  const subtitle = headerLine([t.calendar.teacherCalendar, tzLine], lessons);

  return (
    <Screen>
      <ScreenHeader
        title={teacher.data?.display_name_ar ?? t.calendar.teacherCalendar}
        subtitle={subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
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
        contentContainerStyle={{ paddingBottom: 24 }}
        data={loaded ? days : []}
        keyExtractor={(day) => day.date}
        ListHeaderComponent={loaded && empty ? <Note>{t.schedule.emptyTeacher}</Note> : null}
        renderItem={({ item }) => (
          <AgendaDayView
            day={item}
            today={item.date === today}
            available={availabilityLine(grid.data ?? [], item.date, teacher.data?.tz ?? RIYADH_TZ)}
            onReschedule={setMoving}
          />
        )}
        refreshing={lessons.isRefetching}
        onRefresh={() => {
          void lessons.refetch();
          void grid.refetch();
        }}
        // A new week has no data yet: say it is loading rather than show a blank screen.
        ListEmptyComponent={lessons.isPending ? <Note>{t.common.loading}</Note> : <ErrorState onRetry={() => void lessons.refetch()} />}
      />
      <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
    </Screen>
  );
}
