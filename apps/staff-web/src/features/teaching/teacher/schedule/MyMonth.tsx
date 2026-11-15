import { counted, type TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { Toast } from '@/components/ui/overlay/toast';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { TeacherLessonDrawer } from '@/features/teaching/teacher/lessons/TeacherLessonDrawer';
import { t } from '@/lib/i18n/i18n';
import { MonthBody } from './MonthBody';
import { MonthNav } from './MonthNav';
import { useMyMonth } from './use-my-month';

/**
 * «جدولي» month (owner 2026-11-14): her lessons on a Saturday-first month in her own days
 * (docs/34), one query per shown month. A day lists its lessons; a lesson opens the drawer.
 */
export function MyMonth({ toggle }: { toggle?: ReactNode }) {
  const m = useMyMonth();
  const me = useQuery(teacherMeQuery);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const open = (id: string) => {
    setNotice(null);
    setOpenId(id);
  };
  return (
    <>
      <MonthHead count={[...m.days.values()].flat().length} toggle={toggle} />
      <MonthNav month={m.month} current={m.current} onStep={m.step} onToday={m.toThisMonth} />
      <MonthBody m={m} onOpen={open} onDone={setNotice} />
      <TeacherLessonDrawer
        lessons={m.lessons.data ?? []}
        {...{ openId, notice }}
        {...drawnFor(me.data, m.tz)}
        onClose={() => setOpenId(null)}
        onDone={setNotice}
      />
      {notice && !openId && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}

/** Her zone and fixed link from /teachers/me once read; the viewer's zone until then. */
const drawnFor = (me: TeacherMe | undefined, tz: string) => ({
  tz: me?.tz ?? tz,
  fallbackLink: me?.meeting_link ?? null,
});

function MonthHead({ count, toggle }: { count: number; toggle: ReactNode }) {
  return (
    <PageHead>
      <Cartouche>{t.teacherNav.calendar}</Cartouche>
      {count > 0 && (
        <span className="text-sm text-ink-3 tabular-nums">{counted(t.schedule.lessonCount, count)}</span>
      )}
      {toggle}
    </PageHead>
  );
}
