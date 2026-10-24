import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList } from 'react-native';
import { EditTimeSheet } from '@/edit-time/EditTimeSheet';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { RescheduleSheet } from '@/reschedule/RescheduleSheet';
import { Notice } from '@/today/Notice';
import { useNow } from '@/today/use-day-lessons';
import { useLessonAction } from '@/today/use-lesson-action';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTabBarInset } from '@/ui/tab-bar-inset';
import { headerLine } from './agenda';
import { AgendaItemRow } from './AgendaItemRow';
import { AgendaLessonRow } from './AgendaLessonRow';
import { LessonRowActions } from './LessonRowActions';
import {
  dayCounts,
  itemKey,
  teacherAgendas,
  type ScheduleView,
  type TeacherFilter,
} from './overview';
import { ScheduleFilters } from './ScheduleFilters';
import { SchedulePeriod } from './SchedulePeriod';
import { TeacherHeader } from './TeacherHeader';
import { useOverview } from './use-overview';
import { riyadhToday, weekStart, weekWindow } from './week';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALL: TeacherFilter = { program: 'all', gender: 'all' };

/**
 * «الجدول» (R-SCH-01, R-TCH-02): every teacher, even one with nothing booked, on one Riyadh day
 * (lessons and free gaps by time) or the whole week (lessons by day), from GET /lessons/overview,
 * fetched once per week. Each lesson shows تأكيد / إلغاء (optimistic, R-MOB-03) and «غيّر الميعاد»
 * (the reschedule sheet, R-SCH-07) and «عدّل الوقت» (the in-place edit sheet, R-SCH-11). Filter by program and gender. `back` when it is pushed from
 * «المزيد» rather than opened as its tab; `initialDate` (YYYY-MM-DD) opens it on that day.
 */
export function DayScheduleScreen({ back = false, initialDate }: { back?: boolean; initialDate?: string }) {
  const now = useNow();
  const today = riyadhToday(now);
  const [date, setDate] = useState(initialDate && DATE.test(initialDate) ? initialDate : today);
  const [view, setView] = useState<ScheduleView>('day');
  const [filter, setFilter] = useState<TeacherFilter>(ALL);
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  const action = useLessonAction();
  const inset = useTabBarInset();
  const start = weekStart(date);
  const overview = useOverview(weekWindow(start));
  const data = overview.data;
  const day = view === 'day';
  const agendas = data ? teacherAgendas(data, { start: day ? date : start, view, filter, now }) : [];
  const subtitle = headerLine(
    [t.availability.tzHint.replace('{tz}', t.runningHead.riyadh)],
    overview,
  );
  const lessonRow = (lesson: LessonView) => (
    <AgendaLessonRow
      key={lesson.id}
      lesson={lesson}
      onReschedule={setMoving}
      actions={<LessonRowActions lesson={lesson} action={action} onReschedule={setMoving} onEditTime={setEditing} />}
    />
  );

  return (
    <Screen list>
      <ScreenHeader
        title={t.schedule.nav}
        subtitle={subtitle}
        trailing={
          back ? (
            <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />
          ) : undefined
        }
      />
      <SchedulePeriod view={view} date={date} today={today} onDate={setDate} />
      {action.notice ? <Notice message={action.notice} /> : null}
      <SectionList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        // The cancel reason is typed inside the list: a tap on «إلغاء الحلقة» must land with the keyboard up.
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        // Android defaults to false: the teacher stays on top while their day scrolls.
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <ScheduleFilters
            view={view}
            filter={filter}
            date={date}
            days={day && data ? dayCounts(data, start, filter) : null}
            onView={setView}
            onFilter={setFilter}
            onDate={setDate}
          />
        }
        sections={agendas.map((agenda) => ({ key: agenda.teacher.id, agenda, data: agenda.items }))}
        keyExtractor={itemKey}
        renderSectionHeader={({ section }) => (
          <TeacherHeader agenda={section.agenda} showWindows={day} />
        )}
        renderItem={({ item }) => <AgendaItemRow item={item} lessonRow={lessonRow} />}
        refreshing={overview.isRefetching}
        onRefresh={() => void overview.refetch()}
        ListEmptyComponent={
          overview.isPending ? (
            <Note>{t.common.loading}</Note>
          ) : data ? (
            <EmptyState title={t.booking.noTeachers} />
          ) : (
            <ErrorState onRetry={() => void overview.refetch()} />
          )
        }
      />
      <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
      <EditTimeSheet lesson={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
