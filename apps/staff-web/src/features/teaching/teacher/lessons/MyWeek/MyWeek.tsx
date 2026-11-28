import { counted } from '@ab/core';
import type { LessonView } from '@ab/schedule';
import { addDays, weekWindowIn, zonedPartsIn } from '@ab/time';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import {
  Button,
  Cartouche,
  EmptyState,
  Icon,
  PageHead,
  Toast,
  ListSkeleton,
  Drawer,
  currentWeekStart,
  t,
  useNow,
  useViewerTz,
  cn,
} from '@ab/web-kit';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { WeekGrid } from '@/features/teaching/schedule/grid/WeekGrid';
import { useFollowingDay } from '@/lib/time/use-following-day';
import { myLessonsQuery, teacherMeQuery } from '@/features/teaching/teacher/api';
import { LoadRetry } from '@/features/teaching/teacher/LoadRetry';
import { TeacherLessonCard } from '@/features/teaching/teacher/lessons/TeacherLessonCard';

/** The teacher's own lessons on her week (R-TCH-03, R-SCH-08, docs/34), same grid as admin's. */
export function MyWeek({ toggle }: { toggle?: ReactNode }) {
  const now = useNow();
  const tz = useViewerTz();
  const thisWeek = currentWeekStart(now, tz);
  const today = zonedPartsIn(now, tz).date;
  const [week, setWeek] = useFollowingDay(thisWeek);
  const me = useQuery(teacherMeQuery);
  const lessons = useQuery(myLessonsQuery(weekWindowIn(week, tz)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const open = lessons.data?.find((l) => l.id === openId);

  return (
    <>
      <PageHead>
        <Cartouche>{t.teacherNav.calendar}</Cartouche>
        {lessons.data && lessons.data.length > 0 && (
          <span className="text-sm text-ink-3 tabular-nums">{counted(t.schedule.lessonCount, lessons.data.length)}</span>
        )}
        {toggle}
      </PageHead>
      <div role="group" aria-label={t.booking.weekNav} className="mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setWeek(addDays(week, -7))}>
          <Icon name="chevron-right" />
          {t.schedule.prevWeek}
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={week === thisWeek} onClick={() => setWeek(thisWeek)}>
          {t.schedule.thisWeek}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setWeek(addDays(week, 7))}>
          {t.schedule.nextWeek}
          <Icon name="chevron-left" />
        </Button>
        <span className="ms-1 text-sm font-semibold tabular-nums">{t.schedule.weekOf.replace('{date}', dayMonthLabel(week))}</span>
        <span className="text-xs text-ink-3">{t.schedule.viewerTime}</span>
      </div>
      <Body lessons={lessons} week={week} today={today} onOpen={(l) => setOpenId(l.id)} />
      {open && (
        <Drawer title={studentNames(open)} onClose={() => setOpenId(null)}>
          <TeacherLessonCard
            lesson={open}
            tz={me.data?.tz ?? tz}
            fallbackLink={me.data?.meeting_link ?? null}
            onDone={setNotice}
          />
        </Drawer>
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}

interface BodyProps {
  lessons: {
    data?: LessonView[] | undefined;
    isError: boolean;
    isPlaceholderData: boolean;
    refetch: () => unknown;
  };
  week: string;
  today: string;
  onOpen: (lesson: LessonView) => void;
}

/** Data first (docs/48): a failed 30 s poll keeps the grid; the error shows only with no data. */
function Body({ lessons, week, today, onOpen }: BodyProps) {
  if (!lessons.data) {
    return lessons.isError ? <LoadRetry onRetry={lessons.refetch} /> : <ListSkeleton />;
  }
  if (lessons.data.length === 0) {
    return <EmptyState title={t.teacherDash.noLessonsWeek}>{t.teacherDash.emptyHint}</EmptyState>;
  }
  return (
    <div aria-busy={lessons.isPlaceholderData || undefined} className={cn(lessons.isPlaceholderData && 'opacity-60')}>
      <WeekGrid week={week} today={today} lessons={lessons.data} onOpen={onOpen} />
    </div>
  );
}
