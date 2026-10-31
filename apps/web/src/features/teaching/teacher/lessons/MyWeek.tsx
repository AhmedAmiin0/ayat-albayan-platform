import { counted, type LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Toast } from '@/components/ui/overlay/toast';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Drawer } from '@/features/teaching/schedule/Drawer';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { currentWeekStart } from '@/features/teaching/schedule/reschedule/slots';
import { addDays, dayMonthLabel, weekWindow, zonedParts } from '@/features/teaching/schedule';
import { WeekGrid } from '@/features/teaching/schedule/grid/WeekGrid';
import { t } from '@/lib/i18n/i18n';
import { useFollowingDay } from '@/lib/time/use-following-day';
import { useNow } from '@/lib/time/use-now';
import { useViewerTz } from '@/lib/viewer-tz';
import { cn } from '@/lib/utils';
import { myLessonsQuery, teacherMeQuery } from '../api';
import { TeacherLessonCard } from './TeacherLessonCard';

/**
 * /teacher/calendar «جدولي» (R-TCH-03, R-SCH-08): my lessons on my own week (docs/34), one
 * row, the same grid as the admin's (GET /teachers/me/lessons, own lessons only). A lesson opens
 * my lesson card: join, confirm / attendance, «اقترح ميعاد تاني», the report.
 */
export function MyWeek() {
  const now = useNow();
  const tz = useViewerTz();
  const thisWeek = currentWeekStart(now, tz);
  const [week, setWeek] = useFollowingDay(thisWeek);
  const me = useQuery(teacherMeQuery);
  const lessons = useQuery(myLessonsQuery(weekWindow(week, tz)));
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
      <Body lessons={lessons} week={week} today={zonedParts(now, tz).date} onOpen={(l) => setOpenId(l.id)} />
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
  lessons: { data?: LessonView[] | undefined; isError: boolean; isPlaceholderData: boolean };
  week: string;
  today: string;
  onOpen: (lesson: LessonView) => void;
}

function Body({ lessons, week, today, onOpen }: BodyProps) {
  if (lessons.isError) return <FormAlert>{t.teacherDash.loadError}</FormAlert>;
  if (!lessons.data) return <ListSkeleton />;
  if (lessons.data.length === 0) return <EmptyState title={t.teacherDash.noLessonsWeek}>{t.teacherDash.emptyHint}</EmptyState>;
  return (
    <div aria-busy={lessons.isPlaceholderData || undefined} className={cn(lessons.isPlaceholderData && 'opacity-60')}>
      <WeekGrid week={week} today={today} lessons={lessons.data} onOpen={onOpen} />
    </div>
  );
}
