import { isOpenLesson, type LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';
import { adminDayQuery, dayAround } from './api';
import { ClassroomActions } from './ClassroomActions';

const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

function Row({ lesson }: { lesson: LessonView }) {
  return (
    <li className="grid gap-3 border-b border-rule py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-start">
      <span dir="ltr" className="text-lg font-semibold tabular-nums">{CLOCK.format(new Date(lesson.starts_at))}</span>
      <div className="grid min-w-0 gap-0.5">
        <p className="text-body font-semibold">
          <span className="text-xs font-normal text-ink-3">{t.classroom.admin.students} </span>
          {lesson.students.map((s) => s.name).join('، ')}
        </p>
        <p className="text-xs text-ink-2">
          {t.classroom.admin.teacher} {lesson.teacher.display_name_ar}
        </p>
      </div>
      <ClassroomActions lesson={lesson} />
    </li>
  );
}

/** /admin/classrooms: every teacher's lessons of a day, each with «ادخل الحلقة» and «ابعت لينك الحلقة». */
export function AdminSessions() {
  const [offset, setOffset] = useState(0);
  const day = dayAround(new Date(), offset);
  const lessons = useQuery(adminDayQuery(day));
  const open = (lessons.data ?? []).filter((l) => isOpenLesson(l.status));
  return (
    <section aria-label={t.classroom.admin.title}>
      <PageHead>
        <Cartouche>{t.classroom.admin.title}</Cartouche>
      </PageHead>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => setOffset(offset - 1)}>{t.schedule.prevDay}</Button>
        <Button type="button" variant="secondary" onClick={() => setOffset(0)} disabled={offset === 0}>{t.schedule.today}</Button>
        <Button type="button" variant="secondary" onClick={() => setOffset(offset + 1)}>{t.schedule.nextDay}</Button>
        <h2 className="font-display text-h3 font-bold">{DAY.format(new Date(day.from))}</h2>
      </div>
      {lessons.isPending ? <p className="text-ink-3">{t.common.loading}</p> : null}
      {lessons.isError ? <FormAlert>{t.common.error}</FormAlert> : null}
      {lessons.isSuccess && open.length === 0 ? <EmptyState title={t.classroom.admin.empty} /> : null}
      <ul>
        {open.map((l) => (
          <Row key={l.id} lesson={l} />
        ))}
      </ul>
    </section>
  );
}
