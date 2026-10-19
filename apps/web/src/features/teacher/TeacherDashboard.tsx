import type { TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Tabs } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { errorCode } from '@/features/schedule/api';
import { InternalMeetingButton } from '@/features/meetings/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/meetings/InternalMeetingsList';
import { PendingReports } from '@/features/reports/PendingReports';
import { lessonsOnDay } from '@/features/schedule/lessons';
import { addDays, dayMonthLabel, weekWindow, zonedParts } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { myLessonsQuery, teacherMeQuery } from './api';
import { JoinLink } from './JoinLink';
import { LessonDayList } from './LessonDayList';
import { MyStudents } from './MyStudents';
import { TeacherAvailability } from './TeacherAvailability';

type Tab = 'today' | 'week' | 'students' | 'availability';
const TABS: { value: Tab; label: string }[] = [
  { value: 'today', label: t.teacherDash.today },
  { value: 'week', label: t.teacherDash.week },
  { value: 'students', label: t.teacherDash.myStudents },
  { value: 'availability', label: t.availability.title },
];

/** /teacher home (R-TCH-03, R-SCH-08). The teachers row comes from GET /teachers/me. */
export function TeacherDashboard() {
  const me = useQuery(teacherMeQuery);
  const head = (
    <PageHead>
      <Cartouche>{t.teacher.dashboardTitle}</Cartouche>
      <div className="ms-auto">
        <InternalMeetingButton />
      </div>
    </PageHead>
  );
  if (me.isError) {
    const text = errorCode(me.error) === 'teacher_not_linked' ? t.teacherDash.notLinked : t.teacherDash.loadError;
    return <>{head}<FormAlert>{text}</FormAlert></>;
  }
  if (!me.data) return <>{head}<ListSkeleton /></>;
  return <>{head}<Dashboard me={me.data} /><InternalMeetingsList /></>;
}

/**
 * Today / the next 7 days in the teacher's own zone (a rolling week, so on a Friday it still shows
 * the coming days), their students, their availability.
 */
function Dashboard({ me }: { me: TeacherMe }) {
  const [now] = useState(() => new Date());
  const today = zonedParts(now, me.tz).date;
  const lessons = useQuery(myLessonsQuery(weekWindow(today, me.tz)));
  const range = t.teacherDash.weekRange.replace('{from}', dayMonthLabel(today)).replace('{to}', dayMonthLabel(addDays(today, 6)));
  const [tab, setTab] = useState<Tab>('today');
  const [notice, setNotice] = useState<string | null>(null);
  const list = (which: 'today' | 'week') => {
    if (lessons.isError) return <FormAlert>{t.teacherDash.loadError}</FormAlert>;
    if (!lessons.data) return <ListSkeleton />;
    const shown = which === 'today' ? lessonsOnDay(lessons.data, { date: today, tz: me.tz }) : lessons.data;
    const empty = which === 'today' ? t.teacherDash.noLessonsToday : t.teacherDash.noLessonsWeek;
    return (
      <>
        {which === 'week' && <h2 className="mb-3 text-sm font-semibold text-ink-2">{range}</h2>}
        <LessonDayList lessons={shown} tz={me.tz} fallbackLink={me.meeting_link} empty={empty} onDone={setNotice} />
      </>
    );
  };

  return (
    <>
      {/* Platform classroom (the teacher's mode, else the academy default): no fixed link at the top. */}
      {!me.platform_classroom && <JoinLink link={me.meeting_link} />}
      <PendingReports tz={me.tz} />
      <Tabs label={t.teacherDash.tabs} tabs={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={TABS.find((x) => x.value === tab)?.label}>
        {tab === 'today' && list('today')}
        {tab === 'week' && list('week')}
        {tab === 'students' && <MyStudents students={me.students} />}
        {tab === 'availability' && <TeacherAvailability me={me} />}
      </div>
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
