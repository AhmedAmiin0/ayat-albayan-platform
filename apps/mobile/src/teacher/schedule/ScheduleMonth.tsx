import type { ReactNode } from 'react';
import type { LessonView } from '@ab/shared';
import { RefreshControl, ScrollView } from 'react-native';
import { AgendaDayView, headerLine, PeriodSwitcher, useLessonDetails } from '@/calendar';
import { useClockCycle, zoneNote } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { usePullRefresh } from '@/core/lib/query/pull-refresh';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { MonthGrid } from './MonthGrid';
import { monthTitle } from './month-text';
import { ScheduleSheet } from './ScheduleSheet';
import { useScheduleMonth } from './use-schedule-month';

type Month = ReturnType<typeof useScheduleMonth>;

/** A teacher has no «غيّر الميعاد» (the API never offers her `reschedule`), so it is idle. */
const noMove = () => undefined;

/**
 * «جدولي» month (owner 2026-11-14): her lessons on a Saturday-first month in her own days, a count
 * dot per day; a tap on a day lists its lessons under the grid, a lesson opens «تفاصيل الحلقة».
 */
export function ScheduleMonth({ head }: { head: (subtitle: string) => ReactNode }) {
  const cycle = useClockCycle();
  const m = useScheduleMonth();
  const inset = useTabBarInset();
  const details = useLessonDetails(m.lessons.data);
  const pull = usePullRefresh(() => m.lessons.refetch());
  const day = m.day;
  return (
    <>
      {head(headerLine([zoneNote(m.tz)], m.lessons, { cycle, tz: m.tz }))}
      <PeriodSwitcher
        label={monthTitle(m.month)}
        current={m.current}
        prevLabel={t.teacherSchedule.prevMonth}
        nextLabel={t.teacherSchedule.nextMonth}
        onPrev={() => m.step(-1)}
        onNext={() => m.step(1)}
        onToday={m.toThisMonth}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: 24 + inset }}
        refreshControl={<RefreshControl {...pull} />}
      >
        <MonthGrid month={m.month} today={m.today} picked={day} days={m.days} onPick={m.pick} />
        <MonthBelow m={m} day={day} onOpen={details.open} />
      </ScrollView>
      <ScheduleSheet lesson={details.lesson} onClose={details.close} />
    </>
  );
}

interface BelowProps {
  m: Month;
  day: string | null;
  onOpen: (lesson: LessonView) => void;
}

type BelowKind = 'loading' | 'error' | 'empty' | 'none' | 'day';

const BELOW_RULES: readonly (readonly [BelowKind, (p: BelowProps) => boolean])[] = [
  ['loading', (p) => !p.m.lessons.data && p.m.lessons.isPending],
  ['error', (p) => !p.m.lessons.data],
  ['empty', (p) => p.m.days.size === 0],
  ['none', (p) => p.day === null],
];

const BELOW: Record<BelowKind, (p: BelowProps) => ReactNode> = {
  loading: () => <Note>{t.common.loading}</Note>,
  error: (p) => <ErrorState onRetry={() => void p.m.lessons.refetch()} />,
  empty: () => <Note>{t.teacherSchedule.noLessonsMonth}</Note>,
  none: () => null,
  day: (p) => <PickedDay {...p} date={p.day ?? p.m.today} />,
};

/** Under the grid: loading, the error, a month without lessons, or the picked day's lessons. */
function MonthBelow(p: BelowProps) {
  const kind = BELOW_RULES.find(([, holds]) => holds(p))?.[0] ?? 'day';
  return BELOW[kind](p);
}

/** The picked day as the week shows a day; an empty day says so in its faint line. */
function PickedDay({ m, date, onOpen }: BelowProps & { date: string }) {
  const lessons = m.days.get(date) ?? [];
  return (
    <AgendaDayView
      day={{ date, lessons }}
      today={date === m.today}
      available={lessons.length === 0 ? t.teacherSchedule.noLessonsDay : null}
      onReschedule={noMove}
      onOpen={onOpen}
    />
  );
}
