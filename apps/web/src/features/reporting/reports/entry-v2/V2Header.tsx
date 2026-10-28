import { fillSlots } from '@ab/client-core';
import { lessonWhenAt, type ReportFormEntry, type ReportFormLesson } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';

export interface V2HeaderProps {
  lesson: ReportFormLesson;
  entry: ReportFormEntry;
}

/** «الحلقة 9 من 12» with a package, else «الحلقة 9». */
function lessonChip(entry: ReportFormEntry): string {
  const n = entry.lesson_no;
  const total = entry.package?.lessons_total;
  return total ? fillSlots(t.reports.v2.lessonOf, { n, total }) : fillSlots(t.reports.v2.lessonNo, { n });
}

const CHIP = 'rounded-full bg-sunk px-2.5 py-1 text-xs text-ink-2';

/** The read-only top of the new form: student · code, the lesson chips, «تُملأ … تلقائيًا». */
export function V2Header({ lesson, entry }: V2HeaderProps) {
  const clock = useClock();
  const { student } = entry;
  const when = lessonWhenAt(new Date(lesson.starts_at), { tz: student.tz, ...clock });
  return (
    <header className="grid gap-2 border-b border-rule pb-3">
      <p className="text-body text-ink-2">
        <span className="font-semibold text-ink">{student.name}</span> · <Ltr>{student.code}</Ltr>
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label={t.reports.identity}>
        <li className={CHIP}>{lessonChip(entry)}</li>
        <li className={CHIP}>{when}</li>
        <li className={CHIP}>{fillSlots(t.reports.v2.teacherChip, { name: teacherLabel(lesson.teacher) })}</li>
      </ul>
      <p className="text-xs text-ink-3">{t.reports.v2.autoFilled}</p>
    </header>
  );
}
