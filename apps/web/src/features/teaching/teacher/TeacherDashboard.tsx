import { zonedPartsIn } from '@ab/shared';
import type { TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { Tabs } from '@/components/ui/layout/tabs';
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
import { JoinLink } from './lessons/JoinLink';
import { DashboardPanel, type DashboardTab } from './DashboardPanel';
import { boardWindow } from '@/features/teaching/teacher-board';

const TABS: { value: DashboardTab; label: string }[] = [
  { value: 'students', label: t.teacherBoard.tab },
  { value: 'today', label: t.teacherDash.today },
  { value: 'week', label: t.teacherDash.week },
  { value: 'availability', label: t.availability.title },
];

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
  if (me.isError) {
    const text = errorCode(me.error) === 'teacher_not_linked' ? t.teacherDash.notLinked : t.teacherDash.loadError;
    return <>{head}<FormAlert>{text}</FormAlert></>;
  }
  if (!me.data) return <>{head}<ListSkeleton /></>;
  return <>{head}<Dashboard me={me.data} />{meetingsShown && <InternalMeetingsList />}</>;
}

/**
 * Her home (docs/46 C1): «طلابي» (the board) first, then «اليوم», «الأسبوع» and her availability.
 * One query of the board window (14 days back and ahead) feeds every tab, all in her zone.
 */
function Dashboard({ me }: { me: TeacherMe }) {
  const now = useNow();
  const platform = usePlatformClassroom(me.platform_classroom);
  const today = zonedPartsIn(now, me.tz).date;
  const lessons = useQuery(myLessonsQuery(boardWindow(today, me.tz)));
  const [tab, setTab] = useState<DashboardTab>('students');
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      {/* Platform classroom (the teacher's mode, else the academy default): no fixed link at the top. */}
      {!platform && <JoinLink link={me.meeting_link} />}
      <PendingReports tz={me.tz} />
      <Tabs label={t.teacherDash.tabs} tabs={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={TABS.find((x) => x.value === tab)?.label}>
        <DashboardPanel tab={tab} me={me} lessons={lessons} at={{ now, today }} onDone={setNotice} />
      </div>
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
