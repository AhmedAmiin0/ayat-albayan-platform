import { counted } from '@ab/core';
import type { TeacherMe } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Cartouche, PageHead, Toast, t } from '@ab/web-kit';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { TeacherLessonDrawer } from '@/features/teaching/teacher/lessons/TeacherLessonDrawer';
import { MonthBody } from './MonthBody';
import { MonthNav } from './MonthNav';
import { useMyMonth } from './use-my-month';

/** Saturday-first month in her own days (docs/34), one query per shown month. */
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
