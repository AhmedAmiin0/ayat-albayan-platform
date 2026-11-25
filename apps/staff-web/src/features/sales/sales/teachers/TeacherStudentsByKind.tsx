import { countByKind, splitByStatus, type SalesTeacherView, type StudentListKind } from '@ab/shared';
import { useState } from 'react';
import { SegmentedControl, t } from '@ab/web-kit';
import { TeacherStudentItem } from './TeacherStudentItem';

const L = t.studentLists;
const EMPTY: Record<StudentListKind, string> = { active: L.emptyActive, trial: L.emptyTrial, all: L.emptyAll };

/** Active and trial counts are the API's; the all count is the list's (paused included). */
export function TeacherStudentsByKind({ teacher }: { teacher: SalesTeacherView }) {
  const [kind, setKind] = useState<StudentListKind>('active');
  const { students } = teacher;
  const shown = splitByStatus(students, kind);
  const options = [
    { value: 'active' as const, label: L.active, count: teacher.active_count },
    { value: 'trial' as const, label: L.trial, count: teacher.trial_count },
    { value: 'all' as const, label: L.all, count: countByKind(students).all },
  ];
  return (
    <section aria-label={t.sales.teachers.students} className="grid gap-2">
      <h3 className="flex items-baseline justify-between gap-2 font-semibold">
        {t.sales.teachers.students}
        <span className="text-xs font-normal text-ink-3">{t.schedule.viewerTime}</span>
      </h3>
      <SegmentedControl label={L.kinds} options={options} value={kind} onChange={setKind} className="justify-self-start" />
      {shown.length === 0 ? (
        <p className="text-sm text-ink-3">{EMPTY[kind]}</p>
      ) : (
        <ul className="border-t border-rule">
          {shown.map((s) => (
            <TeacherStudentItem key={s.id} student={s} />
          ))}
        </ul>
      )}
    </section>
  );
}
