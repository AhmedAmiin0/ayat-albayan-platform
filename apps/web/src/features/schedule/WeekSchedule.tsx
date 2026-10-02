import { counted, type LessonView, type Program } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { bookingTeachersQuery } from '@/features/booking/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { lessonsQuery } from './api';
import { LessonDrawer } from './LessonDrawer';
import { filterLessons, needsConfirmCount } from './lessons';
import { ScheduleFilters } from './ScheduleFilters';
import type { ScheduleSearch } from './search';
import { currentWeekStart } from './slots';
import { RIYADH_TZ, weekWindow, zonedParts } from './tz';
import { WeekGrid } from './WeekGrid';

export interface WeekScheduleProps {
  search: ScheduleSearch;
  onSearch: (next: ScheduleSearch) => void;
}

/** Program filter → the ids of the teachers who teach it (LessonView carries no programs). */
function useProgramTeachers(program: Program | undefined): Set<string> | undefined {
  const teachers = useQuery({ ...bookingTeachersQuery({ program: program ?? 'quran', gender: null }), enabled: !!program });
  return program && teachers.data ? new Set(teachers.data.map((x) => x.id)) : undefined;
}

/**
 * /admin/schedule (R-SCH-01, R-SCH-03): the Riyadh week across teachers, filters in the URL,
 * one GET /lessons per week. A lesson chip opens its drawer; writes refresh the week.
 */
export function WeekSchedule({ search, onSearch }: WeekScheduleProps) {
  const [now] = useState(() => new Date());
  const thisWeek = currentWeekStart(now);
  const week = search.week ?? thisWeek;
  const lessons = useQuery(lessonsQuery({ ...weekWindow(week, RIYADH_TZ), teacherId: search.teacher }));
  const teacherIds = useProgramTeachers(search.program);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const shown = filterLessons(lessons.data ?? [], { status: search.status, showClosed: search.closed, teacherIds });
  const open = lessons.data?.find((l) => l.id === openId);

  return (
    <>
      <PageHead>
        <Cartouche>{t.schedule.title}</Cartouche>
        {lessons.data && <Counts shown={shown} />}
        <Link to="/admin/book" className={cn(buttonVariants(), 'ms-auto')}>
          {t.schedule.book}
        </Link>
      </PageHead>
      <ScheduleFilters week={week} thisWeek={thisWeek} search={search} onSearch={(p) => onSearch({ ...search, ...p })} />
      <WeekBody
        query={lessons}
        shown={shown}
        week={week}
        today={zonedParts(now, RIYADH_TZ).date}
        empty={search.teacher ? t.schedule.emptyTeacher : t.schedule.empty}
        onOpen={(l) => setOpenId(l.id)}
      />
      {open && <LessonDrawer lesson={open} onClose={() => setOpenId(null)} onDone={setNotice} />}
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}

/** «5 حلقات» and, in saffron (دورك), «2 يحتاج تأكيد». */
function Counts({ shown }: { shown: readonly LessonView[] }) {
  const waiting = needsConfirmCount(shown);
  return (
    <>
      <span className="text-sm text-ink-3 tabular-nums">{counted(t.schedule.lessonCount, shown.length)}</span>
      {waiting > 0 && (
        <span className="text-sm font-bold text-act tabular-nums">{t.schedule.needsConfirmCount.replace('{n}', String(waiting))}</span>
      )}
    </>
  );
}

interface WeekBodyProps {
  query: UseQueryResult<LessonView[]>;
  shown: readonly LessonView[];
  week: string;
  today: string;
  empty: string;
  onOpen: (lesson: LessonView) => void;
}

function WeekBody({ query, shown, week, today, empty, onOpen }: WeekBodyProps) {
  if (query.isError) return <FormAlert>{t.schedule.loadError}</FormAlert>;
  if (!query.data) return <p className="py-6 text-center text-ink-3">{t.common.loading}</p>;
  if (shown.length === 0) return <EmptyState title={empty}>{t.schedule.emptyHint}</EmptyState>;
  return (
    <div aria-busy={query.isPlaceholderData || undefined} className={cn(query.isPlaceholderData && 'opacity-60')}>
      <WeekGrid week={week} today={today} lessons={shown} onOpen={onOpen} />
    </div>
  );
}
