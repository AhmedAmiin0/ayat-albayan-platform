import { zonedPartsIn } from '@ab/time';
import type { TeacherMe } from '@ab/schedule';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { errorCode } from '@/features/teaching/schedule';
import { InternalMeetingButton } from '@/features/teaching/meetings/internal/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/teaching/meetings/internal/InternalMeetingsList';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { usePlatformClassroom } from '@ab/web-kit/lib/settings/public-config';
import { useTeacherPageOn } from '@/lib/settings/teacher-pages';
import { myLessonsQuery, teacherMeQuery } from '@/features/teaching/teacher/api';
import { DashboardPanel } from '@/features/teaching/teacher/DashboardPanel';
import { LoadRetry } from '@/features/teaching/teacher/LoadRetry';
import { TeacherLessonDrawer } from '@/features/teaching/teacher/lessons/TeacherLessonDrawer';
import { homeToday } from '@/features/teaching/teacher/today/home-today';
import { TodayHero } from '@/features/teaching/teacher/today/TodayHero';
import { boardWindow } from '@/features/teaching/teacher-board';
import { TodayAlerts, useHomePrefs } from '@/features/teaching/teacher/alerts';

/** GET /teachers/me refused: teacher_not_linked offers no retry, anything else does. */
const ME_ERRORS: Partial<Record<string, { text: string; retry: boolean }>> = {
  teacher_not_linked: { text: t.teacherDash.notLinked, retry: false },
};
const ME_ERROR_FALLBACK = { text: t.teacherDash.loadError, retry: true };

/** /teacher home (R-TCH-03, R-SCH-08). The teachers row comes from GET /teachers/me. */
export function TeacherDashboard() {
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
  return <>{head}<Dashboard me={me.data} />{meetingsShown && <InternalMeetingsList />}</>;
}

function MeFallback({ me }: { me: UseQueryResult<TeacherMe> }) {
  if (!me.isError) return <ListSkeleton />;
  const failed = ME_ERRORS[errorCode(me.error) ?? ''] ?? ME_ERROR_FALLBACK;
  return <LoadRetry text={failed.text} onRetry={failed.retry ? me.refetch : undefined} />;
}

/** Her home (docs/46 C1, docs/48): today's lessons only, alerts first, from one 14-day window. */
function Dashboard({ me }: { me: TeacherMe }) {
  const now = useNow();
  const platform = usePlatformClassroom(me.platform_classroom);
  const today = zonedPartsIn(now, me.tz).date;
  const lessons = useQuery(myLessonsQuery(boardWindow(today, me.tz)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const prefs = useHomePrefs();
  const { hero } = homeToday(lessons.data, { now, today, tz: me.tz });
  const drawn = { openId, notice, tz: me.tz, fallbackLink: me.meeting_link };
  // The hero waits for the lessons; a failed load still shows her fixed link as on a day with
  // no hero.
  const settled = lessons.data !== undefined || lessons.isError;
  const onOpen = (id: string) => {
    setNotice(null);
    setOpenId(id);
  };
  return (
    <>
      {lessons.data && <TodayAlerts lessons={lessons.data} now={now} tz={me.tz} onOpen={onOpen} />}
      {settled && prefs.hero && (
        <TodayHero hero={hero} me={me} platform={platform} onOpen={onOpen} onDone={setNotice} />
      )}
      <DashboardPanel
        {...{ me, lessons, prefs, onOpen }}
        at={{ now, today }}
        onDone={setNotice}
      />
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
