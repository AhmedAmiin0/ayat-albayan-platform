import { addDays, type LessonView, type TeacherMe } from '@ab/shared';
import type { ReactNode } from 'react';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { dayMonthLabel, lessonsOnDay } from '@/features/teaching/schedule';
import { TeacherBoard, weekLessons } from '@/features/teaching/teacher-board';
import { t } from '@/lib/i18n/i18n';
import { LessonDayList } from './lessons/LessonDayList';
import { LoadRetry } from './LoadRetry';
import { TeacherAvailability } from './proposals/TeacherAvailability';

export type DashboardTab = 'students' | 'today' | 'week' | 'availability';

export interface DashboardPanelProps {
  tab: DashboardTab;
  me: TeacherMe;
  /** The board window's lessons (one query for every tab); undefined while loading. */
  lessons: { data: LessonView[] | undefined; isError: boolean; refetch: () => unknown };
  /** Her «now» and today on her calendar (me.tz: the one zone of the home). */
  at: { now: Date; today: string };
  onDone: (message: string) => void;
}

type Ready = Omit<DashboardPanelProps, 'lessons' | 'tab'> & { lessons: LessonView[] };

const weekRange = (today: string) =>
  t.teacherDash.weekRange
    .replace('{from}', dayMonthLabel(today))
    .replace('{to}', dayMonthLabel(addDays(today, 6)));

const PANELS: Record<Exclude<DashboardTab, 'availability'>, (p: Ready) => ReactNode> = {
  students: (p) => <TeacherBoard me={p.me} lessons={p.lessons} now={p.at.now} onDone={p.onDone} />,
  today: (p) => (
    <LessonDayList
      lessons={lessonsOnDay(p.lessons, { date: p.at.today, tz: p.me.tz })}
      tz={p.me.tz}
      fallbackLink={p.me.meeting_link}
      empty={t.teacherDash.noLessonsToday}
      onDone={p.onDone}
    />
  ),
  week: (p) => (
    <>
      <h2 className="mb-3 text-sm font-semibold text-ink-2">{weekRange(p.at.today)}</h2>
      <LessonDayList
        lessons={weekLessons(p.lessons, { today: p.at.today, tz: p.me.tz })}
        tz={p.me.tz}
        fallbackLink={p.me.meeting_link}
        empty={t.teacherDash.noLessonsWeek}
        onDone={p.onDone}
      />
    </>
  ),
};

/** The open tab of the teacher home: the board, today, the week, or her availability. */
export function DashboardPanel({ tab, lessons, ...rest }: DashboardPanelProps) {
  if (tab === 'availability') return <TeacherAvailability me={rest.me} />;
  // Data first (docs/48): a failed 30 s poll keeps the cached lessons on screen.
  if (lessons.data) return PANELS[tab]({ ...rest, lessons: lessons.data });
  return lessons.isError ? <LoadRetry onRetry={lessons.refetch} /> : <ListSkeleton />;
}
