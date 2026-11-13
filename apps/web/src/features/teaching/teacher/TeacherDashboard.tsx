import { zonedPartsIn } from '@ab/shared';
import type { TeacherMe } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { tabIds, Tabs } from '@/components/ui/layout/tabs';
import { Toast } from '@/components/ui/overlay/toast';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { errorCode } from '@/features/teaching/schedule';
import { InternalMeetingButton } from '@/features/teaching/meetings/internal/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/teaching/meetings/internal/InternalMeetingsList';
import { PendingReports } from '@/features/reporting/reports';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { usePlatformClassroom } from '@/lib/settings/public-config';
import { useTeacherPageOn } from '@/lib/settings/teacher-pages';
import { myLessonsQuery, teacherMeQuery } from './api';
import { DashboardPanel } from './DashboardPanel';
import { type HomeTabProps, useHomeTab } from './home-search';
import { LoadRetry } from './LoadRetry';
import { TeacherLessonDrawer } from './lessons/TeacherLessonDrawer';
import { homeToday } from './today/home-today';
import { TodayHero } from './today/TodayHero';
import { boardWindow } from '@/features/teaching/teacher-board';

const homeTabs = (todayCount: number | undefined) => [
  { value: 'students' as const, label: t.teacherBoard.tab },
  { value: 'today' as const, label: t.teacherDash.today, count: todayCount },
  { value: 'week' as const, label: t.teacherDash.week },
  { value: 'availability' as const, label: t.availability.title },
];

/** GET /teachers/me refused: teacher_not_linked offers no retry, anything else does. */
const ME_ERRORS: Partial<Record<string, { text: string; retry: boolean }>> = {
  teacher_not_linked: { text: t.teacherDash.notLinked, retry: false },
};
const ME_ERROR_FALLBACK = { text: t.teacherDash.loadError, retry: true };

/** /teacher home (R-TCH-03, R-SCH-08). The teachers row comes from GET /teachers/me. */
export function TeacherDashboard(props: Partial<HomeTabProps>) {
  const me = useQuery(teacherMeQuery);
  const pageOn = useTeacherPageOn();
  const instant = pageOn('internalMeetings');
  const scheduled = pageOn('scheduledMeetings');
  const meetingsShown = instant || scheduled;
  const head = (
    <PageHead>
      <Cartouche>{t.teacher.dashboardTitle}</Cartouche>
      {meetingsShown && (
        <div className="ms-auto">
          <InternalMeetingButton instant={instant} scheduled={scheduled} />
        </div>
      )}
    </PageHead>
  );
  // Data first (docs/48): a failed refetch over a good me keeps the home.
  if (!me.data) return <>{head}<MeFallback me={me} /></>;
  return <>{head}<Dashboard me={me.data} {...props} />{meetingsShown && <InternalMeetingsList />}</>;
}

/** No me yet: the skeleton, or why not (with «حاول مرة أخرى» unless only the admin can fix it). */
function MeFallback({ me }: { me: UseQueryResult<TeacherMe> }) {
  if (!me.isError) return <ListSkeleton />;
  const failed = ME_ERRORS[errorCode(me.error) ?? ''] ?? ME_ERROR_FALLBACK;
  return <LoadRetry text={failed.text} onRetry={failed.retry ? me.refetch : undefined} />;
}

/**
 * Her home (docs/46 C1, docs/48): the hero (the lesson under way or next today) and the pending
 * reports above the tabs «طلابي» · «اليوم n» · «الأسبوع» · availability. One query of the board
 * window (14 days back and ahead) feeds them all, in her zone; a lesson opens in one drawer.
 */
function Dashboard({ me, ...props }: { me: TeacherMe } & Partial<HomeTabProps>) {
  const now = useNow();
  const platform = usePlatformClassroom(me.platform_classroom);
  const today = zonedPartsIn(now, me.tz).date;
  const lessons = useQuery(myLessonsQuery(boardWindow(today, me.tz)));
  const { tab, onTab } = useHomeTab(props);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { hero, count } = homeToday(lessons.data, { now, today, tz: me.tz });
  const ids = tabIds('teacher-home', tab);
  const drawn = { openId, notice, tz: me.tz, fallbackLink: me.meeting_link };
  // The hero and the block wait for the lessons (no flash of the hero's own report); a failed
  // load still shows her fixed link as on a day with no hero.
  const settled = lessons.data !== undefined || lessons.isError;
  const onOpen = (id: string) => {
    setNotice(null);
    setOpenId(id);
  };
  return (
    <>
      {settled && (
        <>
          <TodayHero hero={hero} me={me} platform={platform} onOpen={onOpen} onDone={setNotice} />
          <PendingReports tz={me.tz} except={hero?.lesson.id} />
        </>
      )}
      <Tabs label={t.teacherDash.tabs} tabs={homeTabs(count)} value={tab} onChange={onTab} idPrefix="teacher-home" />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
        <DashboardPanel {...{ tab, me, lessons }} at={{ now, today }} onDone={setNotice} onOpen={onOpen} />
      </div>
      <TeacherLessonDrawer
        lessons={lessons.data ?? []}
        {...drawn}
        onClose={() => setOpenId(null)}
        onDone={setNotice}
      />
      {notice && !openId && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
