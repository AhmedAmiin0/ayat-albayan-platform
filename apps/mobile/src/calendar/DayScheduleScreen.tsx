import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { RescheduleSheet } from '@/reschedule/RescheduleSheet';
import { useDayLessons, useNow } from '@/today/use-day-lessons';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { byTeacher, headerLine } from './agenda';
import { PeriodSwitcher } from './PeriodSwitcher';
import { TeacherGroup } from './TeacherGroup';
import { addDays, dayLabel, riyadhNoon, riyadhToday } from './week';

/**
 * «الجدول» (R-SCH-01): every teacher's lessons on one Riyadh day, grouped by teacher, with the
 * agenda rows of the teacher calendar. ‹ › moves a day; the day's cache is Today's (GET
 * /lessons/day), so today opens at once. Pull to refresh; offline the saved day stays.
 */
export function DayScheduleScreen() {
  const today = riyadhToday(useNow());
  const [date, setDate] = useState(today);
  const day = useDayLessons(riyadhNoon(date));
  const [moving, setMoving] = useState<LessonView | null>(null);
  const loaded = day.data !== undefined;
  const subtitle = headerLine([t.availability.tzHint.replace('{tz}', t.runningHead.riyadh)], day);

  return (
    <Screen>
      <ScreenHeader
        title={t.schedule.nav}
        subtitle={subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <PeriodSwitcher
        label={dayLabel(date)}
        current={date === today}
        prevLabel={t.calendar.prevDay}
        nextLabel={t.calendar.nextDay}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        onToday={() => setDate(today)}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        data={byTeacher(day.data ?? [])}
        keyExtractor={(group) => group.teacher.id}
        renderItem={({ item }) => <TeacherGroup group={item} onReschedule={setMoving} />}
        refreshing={day.isRefetching}
        onRefresh={() => void day.refetch()}
        ListEmptyComponent={
          day.isPending ? null : loaded ? (
            <EmptyState title={t.calendar.emptyDay} />
          ) : (
            <ErrorState onRetry={() => void day.refetch()} />
          )
        }
      />
      <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
    </Screen>
  );
}
