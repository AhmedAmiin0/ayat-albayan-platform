import { scheduleWeek, weekSchedule } from '@ab/client-core';
import { dateText, type PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { EmptyState, ErrorState, FilterPills, SkeletonCard, t, useNow } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useChildrenLessons, useFamilyClock, usePortalMe, useRefreshPortal } from '@/portal';
import { ScheduleDay } from './ScheduleDay';
import { WeekNav } from './WeekNav';

/** The join button lights up within a few seconds of the window. */
const TICK_MS = 5000;
const ALL = 'all';

/** «الكل» and one chip per child (a guardian with more than one). */
const chips = (students: readonly PortalStudent[]) => [
  { value: ALL, label: t.portal.app.schedule.all },
  ...students.map((s) => ({ value: s.id, label: s.name })),
];

/**
 * «الجدول» (docs/50 §6, canvas Schedule / StudentSchedule): one academy week of the lessons still
 * ahead on this phone's clock; a guardian's across every child with filter chips, a student's own.
 */
export function ScheduleScreen() {
  const me = usePortalMe();
  const students = me.data?.students ?? [];
  const named = me.data?.kind === 'guardian';
  const [offset, setOffset] = useState(0);
  const [chip, setChip] = useState(ALL);
  const week = useChildrenLessons(students);
  const clock = useFamilyClock();
  const now = useNow(TICK_MS);
  const refresh = useRefreshPortal();
  const only = chip === ALL ? null : chip;
  const days = weekSchedule({ children: week.children, tz: clock.tz, offset, only }, now);
  const bounds = scheduleWeek(now, clock.tz, offset);
  const day = (d: string) =>
    dateText(
      new Date(`${d}T12:00:00Z`),
      { ...clock, tz: 'UTC' },
      { day: 'numeric', month: 'long' },
    );
  const S = t.portal.app.schedule;
  return (
    <FamilyPage header={<FamilyHeader title={named ? S.title : S.mine} />} onRefresh={refresh}>
      <WeekNav
        offset={offset}
        range={`${day(bounds.from)} – ${day(bounds.to)}`}
        onChange={setOffset}
      />
      {named && students.length > 1 ? (
        <FilterPills
          items={chips(students)}
          value={chip}
          onChange={setChip}
          accessibilityLabel={S.filter}
        />
      ) : null}
      {week.loading || !me.data ? <SkeletonCard /> : null}
      {week.failed ? <ErrorState onRetry={week.retry} /> : null}
      {!week.loading && !week.failed && days.length === 0 ? <EmptyState title={S.empty} /> : null}
      {days.map((d) => (
        <ScheduleDay key={d.day} day={d} clock={clock} now={now} named={named} />
      ))}
    </FamilyPage>
  );
}
