import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList } from 'react-native';
import { JoinAround } from '@/classroom';
import { EditTimeSheet } from '@/edit-time/components/EditTimeSheet';
import { t } from '@/core/lib/i18n/i18n';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { Note } from '@/more/Note';
import { RescheduleSheet } from '@/teaching/reschedule/RescheduleSheet';
import { Notice } from '@/today/components/Notice';
import { useNow } from '@/core/lib/time/use-now';
import { useLessonAction } from '@/today/lib/use-lesson-action';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { headerLine } from '../agenda/agenda';
import { AgendaItemRow } from '../agenda/AgendaItemRow';
import { AgendaLessonRow } from '../agenda/AgendaLessonRow';
import { LessonRowActions } from '../agenda/LessonRowActions';
import { LessonDetailsSheet } from '../details/LessonDetailsSheet';
import { useLessonDetails } from '../details/use-lesson-details';
import {
  dayCounts,
  itemKey,
  teacherAgendas,
  type ScheduleView,
  type TeacherFilter,
} from '../overview/overview';
import { ScheduleFilters } from '../overview/ScheduleFilters';
import { SchedulePeriod } from '../overview/SchedulePeriod';
import { TeacherHeader } from '../overview/TeacherHeader';
import { useOverview } from '../overview/use-overview';
import { riyadhToday, weekStart, weekWindow } from '../lib/week';
import { useClockCycle, useViewerTz, zoneNote } from '@/core/lib/clock';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALL: TeacherFilter = { program: 'all', gender: 'all' };

/**
 * «الجدول» (R-SCH-01, R-TCH-02): every teacher, even one with nothing booked, on one academy day
 * (lessons and free gaps by time) or the whole week (lessons by day), from GET /lessons/overview,
 * fetched once per week. Each lesson shows تأكيد / إلغاء (optimistic, R-MOB-03) and «غيّر الميعاد»
 * (the reschedule sheet, R-SCH-07) and «عدّل الوقت» (the in-place edit sheet, R-SCH-11); a tap on the row opens «تفاصيل الحلقة» with the same actions. Filter by program and gender. `back` when it is pushed from
 * «المزيد» rather than opened as its tab; `initialDate` (YYYY-MM-DD) opens it on that day.
 */
export function DayScheduleScreen({ back = false, initialDate }: { back?: boolean; initialDate?: string }) {
  const cycle = useClockCycle();
  const now = useNow();
  // academy day (docs/34 b): the overview pages by Riyadh days; times read in the viewer's zone.
  const today = riyadhToday(now);
  const [date, setDate] = useFollowingDay(today, initialDate && DATE.test(initialDate) ? initialDate : undefined);
  const [view, setView] = useState<ScheduleView>('day');
  const [filter, setFilter] = useState<TeacherFilter>(ALL);
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  const action = useLessonAction();
  const inset = useTabBarInset();
  const start = weekStart(date);
  const overview = useOverview(weekWindow(start));
  const data = overview.data;
  const details = useLessonDetails(data?.lessons);
  const day = view === 'day';
  const agendas = data ? teacherAgendas(data, { start: day ? date : start, view, filter, now }) : [];
  const subtitle = headerLine([zoneNote(useViewerTz())], overview, cycle);
  const actionsOf = (lesson: LessonView, onLeave?: () => void) => (
    <LessonRowActions lesson={lesson} action={action} onReschedule={setMoving} onEditTime={setEditing} onLeave={onLeave} />
  );
  const lessonRow = (lesson: LessonView) => (
    <AgendaLessonRow key={lesson.id} lesson={lesson} onReschedule={setMoving} actions={actionsOf(lesson)} onOpen={details.open} />
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
      <LessonDetailsSheet
        lesson={details.lesson}
        role="admin"
        onClose={details.close}
        actions={(l) => <JoinAround lesson={l}>{actionsOf(l, details.close)}</JoinAround>}
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
