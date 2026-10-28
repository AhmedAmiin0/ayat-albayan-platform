import { RIYADH_TZ, teacherName, type LessonView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { JoinAround } from '@/classroom';
import { EditTimeSheet } from '@/edit-time/components/EditTimeSheet';
import { t } from '@/core/lib/i18n/i18n';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { locale } from '@/core/lib/i18n/locale';
import { Note } from '@/more/Note';
import { RescheduleSheet } from '@/teaching/reschedule/RescheduleSheet';
import { useNow } from '@/core/lib/time/use-now';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { agendaDays, availabilityLine, headerLine } from '../agenda/agenda';
import { AgendaDayView } from '../agenda/AgendaDayView';
import { RowDefaultActions } from '../agenda/RowDefaultActions';
import { LessonDetailsSheet } from '../details/LessonDetailsSheet';
import { useLessonDetails } from '../details/use-lesson-details';
import { PeriodSwitcher } from '../overview/PeriodSwitcher';
import { useAvailability, useTeacher, useWeekLessons } from '../lib/queries';
import { addDays, riyadhToday, weekLabel, weekStart, weekWindow } from '../lib/week';
import { useClockCycle } from '@/core/lib/clock';

/**
 * «جدول المعلم/ة» (R-TCH-02, R-SCH-01): one teacher's week, السبت → الجمعة, as a day-by-day agenda
 * in Riyadh time with the teacher's own clock beside it when it differs, and each day's
 * availability as a faint line. ‹ › moves a week; a lesson's «غيّر الميعاد» opens the reschedule
 * sheet and «عدّل الوقت» the in-place edit sheet; a tap on the row opens «تفاصيل الحلقة». Pull to refresh; offline the saved week stays with its «آخر تحديث».
 */
export function TeacherCalendarScreen() {
  const cycle = useClockCycle();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const today = riyadhToday(useNow());
  const [start, setStart] = useFollowingDay(weekStart(today));
  const lessons = useWeekLessons({ ...weekWindow(start), teacherId: id });
  const teacher = useTeacher(id);
  const grid = useAvailability(id);
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  const details = useLessonDetails(lessons.data);
  const loaded = lessons.data !== undefined;
  const days = agendaDays(lessons.data ?? [], start);
  const empty = days.every((d) => d.lessons.length === 0);
  const tzLine = t.availability.tzHint.replace('{tz}', t.runningHead.riyadh);
  const subtitle = headerLine([t.calendar.teacherCalendar, tzLine], lessons, cycle);

  return (
    <Screen>
      <ScreenHeader
        title={(teacher.data && teacherName(teacher.data, locale)) ?? t.calendar.teacherCalendar}
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
        extraData={cycle}
        ListHeaderComponent={loaded && empty ? <Note>{t.schedule.emptyTeacher}</Note> : null}
        renderItem={({ item }) => (
          <AgendaDayView
            day={item}
            today={item.date === today}
            available={availabilityLine(grid.data ?? [], { date: item.date, teacherTz: teacher.data?.tz ?? RIYADH_TZ, cycle })}
            onReschedule={setMoving}
            onEditTime={setEditing}
            onOpen={details.open}
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
      <LessonDetailsSheet
        lesson={details.lesson}
        role="admin"
        onClose={details.close}
        actions={(l) => (
          <JoinAround lesson={l}>
            <RowDefaultActions lesson={l} onReschedule={setMoving} onEditTime={setEditing} />
          </JoinAround>
        )}
        sheets={
          <>
            <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
            <EditTimeSheet lesson={editing} onClose={() => setEditing(null)} />
          </>
        }
      />
    </Screen>
  );
}
