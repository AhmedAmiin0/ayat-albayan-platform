import type { LessonView, ScheduleOverview } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NewMeetingMenu } from '@/features/meetings/NewMeetingMenu';
import { overviewQuery, proposalsQuery } from './api';
import { DayBoard } from './DayBoard';
import { LessonDrawer } from './LessonDrawer';
import { filterLessons } from './lessons';
import { boardRows, dayWindow, filterTeachers, type BoardRow } from './overview';
import { ProposalsPanel } from './ProposalsPanel';
import { ScheduleCounts } from './ScheduleCounts';
import { ScheduleFilters } from './ScheduleFilters';
import { ScheduleNav } from './ScheduleNav';
import { SyncScheduleButton } from './SyncScheduleButton';
import type { ScheduleSearch } from './search';
import { currentWeekStart } from './slots';
import { RIYADH_TZ, weekWindow, zonedParts } from './tz';
import { WeekGrid } from './WeekGrid';

export interface WeekScheduleProps {
  search: ScheduleSearch;
  onSearch: (next: ScheduleSearch) => void;
}

/**
 * /admin/schedule (R-SCH-01, R-SCH-03, R-SCH-08): the teachers' pending proposals, then every
 * teacher's Riyadh week (or one day) with hours, time off, load and free time, filters in the URL,
 * one GET /lessons/overview per window. A chip opens its drawer; writes refresh the calendar.
 */
export function WeekSchedule({ search, onSearch }: WeekScheduleProps) {
  const [now] = useState(() => new Date());
  const today = zonedParts(now, RIYADH_TZ).date;
  const day = search.view === 'day' ? (search.day ?? today) : null;
  const week = search.week ?? currentWeekStart(now);
  const overview = useQuery(overviewQuery(day ? dayWindow(day) : weekWindow(week, RIYADH_TZ)));
  const proposals = useQuery(proposalsQuery);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const all = overview.data?.teachers ?? [];
  const teachers = filterTeachers(all, { program: search.program, gender: search.gender, ids: search.teachers });
  const teacherIds = new Set(teachers.map((x) => x.id));
  const shown = filterLessons(overview.data?.lessons ?? [], { status: search.status, showClosed: search.closed, teacherIds });
  // A proposal's lesson may sit in another week than the one on screen.
  const open = overview.data?.lessons.find((l) => l.id === openId) ?? proposals.data?.find((l) => l.id === openId);
  const patch = (p: Partial<ScheduleSearch>) => onSearch({ ...search, ...p });

  return (
    <>
      <PageHead>
        <Cartouche>{t.schedule.title}</Cartouche>
        {overview.data && <ScheduleCounts shown={shown} />}
        <div className="ms-auto flex flex-wrap gap-2">
          <SyncScheduleButton onDone={setNotice} />
          <NewMeetingMenu />
          <Link to="/admin/book" className={buttonVariants()}>
            {t.schedule.book}
          </Link>
        </div>
      </PageHead>
      <ProposalsPanel onOpen={(l) => setOpenId(l.id)} />
      <div className="mb-4 grid gap-3">
        <ScheduleNav search={search} today={today} onSearch={patch} />
        <ScheduleFilters search={search} teachers={all} onSearch={patch} />
      </div>
      <Body
        query={overview}
        rows={boardRows(teachers, shown)}
        view={{ day, week, today, now }}
        onOpen={(l) => setOpenId(l.id)}
      />
      {open && <LessonDrawer lesson={open} onClose={() => setOpenId(null)} onDone={setNotice} />}
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}

interface BodyProps {
  query: UseQueryResult<ScheduleOverview>;
  /** Filtered teachers with their shown lessons. */
  rows: BoardRow[];
  view: { day: string | null; week: string; today: string; now: Date };
  onOpen: (lesson: LessonView) => void;
}

function Body({ query, rows, view, onOpen }: BodyProps) {
  if (query.isError) return <FormAlert>{t.schedule.loadError}</FormAlert>;
  if (!query.data) return <ListSkeleton />;
  if (rows.length === 0) {
    return <EmptyState title={query.data.teachers.length === 0 ? t.teachers.empty : t.booking.noTeachers} />;
  }
  return (
    <div aria-busy={query.isPlaceholderData || undefined} className={cn(query.isPlaceholderData && 'opacity-60')}>
      {view.day ? (
        <DayBoard day={view.day} rows={rows} now={view.now} onOpen={onOpen} />
      ) : (
        <WeekGrid
          week={view.week}
          today={view.today}
          lessons={rows.flatMap((r) => [...r.days.values()].flat())}
          teachers={rows.map((r) => r.teacher)}
          now={view.now}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
