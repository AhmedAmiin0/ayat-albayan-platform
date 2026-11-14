import type { ReactNode } from 'react';
import { FlatList } from 'react-native';
import {
  AgendaDayView,
  availabilityLine,
  headerLine,
  PeriodSwitcher,
  weekLabel,
  weekStart,
} from '@/calendar';
import { useClockCycle, zoneNote } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { ScheduleSheet } from './ScheduleSheet';
import { useScheduleWeek } from './use-schedule-week';

/** A teacher has no «غيّر الميعاد» (the API never offers her `reschedule`), so it is idle. */
const noMove = () => undefined;

type Week = ReturnType<typeof useScheduleWeek>;

/**
 * «جدولي» week: السبت → الجمعة from GET /teachers/me/lessons, day by day in her own days and clock
 * (docs/34), her availability as a faint line. ‹ › moves a week; offline the saved week stays.
 * `head(subtitle)` draws the screen's header and the period switch above it.
 */
export function ScheduleWeek({ head }: { head: (subtitle: string) => ReactNode }) {
  const cycle = useClockCycle();
  const w = useScheduleWeek();
  return (
    <>
      {head(headerLine([zoneNote(w.tz)], w.lessons, { cycle, tz: w.tz }))}
      <PeriodSwitcher
        label={weekLabel(w.start)}
        current={w.start === weekStart(w.today)}
        prevLabel={t.schedule.prevWeek}
        nextLabel={t.schedule.nextWeek}
        onPrev={() => w.step(-1)}
        onNext={() => w.step(1)}
        onToday={w.toThisWeek}
      />
      <WeekList w={w} />
      <ScheduleSheet lesson={w.details.lesson} onClose={w.details.close} />
    </>
  );
}

function WeekList({ w }: { w: Week }) {
  const cycle = useClockCycle();
  const inset = useTabBarInset();
  const loaded = w.lessons.data !== undefined;
  const failed = <ErrorState onRetry={() => void w.lessons.refetch()} />;
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 + inset }}
      data={loaded ? w.days : []}
      keyExtractor={(day) => day.date}
      extraData={cycle}
      ListHeaderComponent={loaded && w.empty ? <Note>{t.teacherDash.noLessonsWeek}</Note> : null}
      renderItem={({ item }) => (
        <AgendaDayView
          day={item}
          today={item.date === w.today}
          available={availabilityLine(w.grid, { date: item.date, teacherTz: w.teacherTz, cycle })}
          onReschedule={noMove}
          onOpen={w.details.open}
        />
      )}
      refreshing={w.pull.refreshing}
      onRefresh={w.pull.onRefresh}
      ListEmptyComponent={w.lessons.isPending ? <Note>{t.common.loading}</Note> : failed}
    />
  );
}
