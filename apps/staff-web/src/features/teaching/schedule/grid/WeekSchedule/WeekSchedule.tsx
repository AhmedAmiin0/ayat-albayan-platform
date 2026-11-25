import { weekWindowIn, zonedPartsIn } from '@ab/time';
import type { LessonView, ScheduleOverview } from '@ab/schedule';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { cn } from '@ab/web-kit/lib/utils';
import { NewMeetingMenu } from '@/features/teaching/meetings/NewMeetingMenu';
import { overviewQuery, proposalsQuery } from '@/features/teaching/schedule/api';
import { DayBoard } from '@/features/teaching/schedule/grid/DayBoard';
import { LessonDrawer } from '@/features/teaching/schedule/lesson/LessonDrawer';
import { filterLessons } from '@/features/teaching/schedule/lesson/lessons';
import { boardRows, dayWindow, filterTeachers, type BoardRow } from '@/features/teaching/schedule/overview';
import { ProposalsPanel } from '@/features/teaching/schedule/reschedule/proposals/ProposalsPanel';
import { ScheduleCounts } from '@/features/teaching/schedule/ScheduleCounts';
import { ScheduleFilters } from '@/features/teaching/schedule/filters/ScheduleFilters';
import { ScheduleNav } from '@/features/teaching/schedule/ScheduleNav';
import { SyncScheduleButton } from '@/features/teaching/schedule/SyncScheduleButton';
import type { ScheduleSearch } from '@/features/teaching/schedule/filters/search';
import { currentWeekStart } from '@ab/web-kit/schedule/slots';
import { WeekGrid } from '@/features/teaching/schedule/grid/WeekGrid';
import { HeadActions } from '@ab/web-kit/components/ui/layout/head-actions';

export interface WeekScheduleProps {
  search: ScheduleSearch;
  onSearch: (next: ScheduleSearch) => void;
}

/**
 * /admin/schedule (R-SCH-01, R-SCH-03, R-SCH-08): the teachers' pending proposals, then every
 * teacher's week (or one day) in the viewer's zone (docs/34) with hours, time off, load and free
 * time, filters in the URL, one GET /lessons/overview per window. A chip opens its drawer;
 * writes refresh the calendar.
 */
export function WeekSchedule({ search, onSearch }: WeekScheduleProps) {
  const now = useNow();
  const tz = useViewerTz();
  const today = zonedPartsIn(now, tz).date;
  const day = search.view === 'day' ? (search.day ?? today) : null;
  const week = search.week ?? currentWeekStart(now, tz);
  const overview = useQuery(overviewQuery(day ? dayWindow(day, tz) : weekWindowIn(week, tz)));
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
        {/* Booking is the page's one filled primary; other entries live elsewhere. */}
        <HeadActions
          primary={
            <Link to="/admin/book" className={buttonVariants()}>
              {t.schedule.book}
            </Link>
          }
          more={
            <>
              <SyncScheduleButton onDone={setNotice} />
              <div className="max-sm:hidden">
                <NewMeetingMenu variant="secondary" />
              </div>
            </>
          }
        />
      </PageHead>
      <ProposalsPanel onOpen={(l) => setOpenId(l.id)} />
      <div className="mb-3">
        <ScheduleNav search={search} today={today} onSearch={patch} />
      </div>
      <ScheduleFilters
        search={search}
        teachers={all}
        onSearch={patch}
        resultCount={overview.data ? shown.length : undefined}
      />
      <Body
        query={overview}
        rows={boardRows(teachers, shown, tz)}
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
    return (
      <EmptyState
        title={query.data.teachers.length === 0 ? t.teachers.empty : t.booking.noTeachers}
      />
    );
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
