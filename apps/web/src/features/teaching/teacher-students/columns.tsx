import { isPackageEnded, PROGRAMS, studentStatusStyle, type TeacherStudentView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnFilterDef, DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { nextLessonText } from './next-lesson';
import { useClock } from '@/lib/clock';

const col = createColumnHelper<DataTableFeatures, TeacherStudentView>();
const ts = t.teacherStudents;
const text: ColumnFilterDef = { kind: 'text' };
// The column's value is the program's name (it sorts by what the row shows), so is the option's.
const programs: ColumnFilterDef = { kind: 'select', options: PROGRAMS.map((p) => ({ value: t.enums.program[p], label: t.enums.program[p] })) };
const fact = 'text-sm text-ink-2';

/** «الحلقة القادمة: …» in the viewer's cycle (12 or 24 h). */
function NextLesson({ iso }: { iso: string | null }) {
  return <>{nextLessonText(iso, useClock())}</>;
}

/**
 * My students (R-TCH-03): name (opens the report history; a «بانتظار التجديد» / «انتهى الاشتراك»
 * chip when the package ended, owner 2026-10-12, 2026-10-15), code, program, level, age, next lesson.
 * Sorted and filtered locally (the whole list is loaded). Under 640px the row stacks like the old
 * card: name + code, then program · level · age, then the next lesson.
 */
export const teacherStudentColumns = col.columns([
  col.accessor('name', {
    header: () => t.students.name,
    cell: (c) => (
      <span className="inline-flex flex-wrap items-center gap-x-2">
        <Link
          to="/teacher/reports/$studentId"
          params={{ studentId: c.row.original.id }}
          title={ts.openReports.replace('{name}', c.getValue())}
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4"
        >
          {c.getValue()}
        </Link>
        {isPackageEnded(c.row.original.status) && (
          <StatusChip size="sm" {...studentStatusStyle[c.row.original.status]} label={t.enums.studentStatus[c.row.original.status]} />
        )}
      </span>
    ),
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: text },
  }),
  col.accessor('code', {
    header: () => t.students.code,
    cell: (c) => <Ltr className="text-ink-2">{c.getValue()}</Ltr>,
    meta: { className: 'text-sm max-sm:order-2 max-sm:ms-auto', filter: text },
  }),
  col.accessor((s) => t.enums.program[s.program], {
    id: 'program',
    header: () => t.students.program,
    cell: (c) => c.getValue(),
    meta: { className: `${fact} max-sm:order-3`, filter: programs, filterKey: 'program' },
  }),
  col.accessor('level', {
    header: () => ts.levelCol,
    cell: (c) => c.getValue() ?? '—',
    meta: { className: `${fact} max-sm:order-4`, filter: text },
  }),
  col.accessor('age', {
    header: () => ts.ageCol,
    cell: (c) => {
      const age = c.getValue();
      return age === null ? '—' : ts.age.replace('{n}', String(age));
    },
    meta: { className: `${fact} tabular-nums max-sm:order-5` },
  }),
  col.accessor('next_lesson_at', {
    header: () => ts.nextLessonCol,
    cell: (c) => <NextLesson iso={c.getValue()} />,
    meta: { className: 'text-xs text-ink-3 max-sm:order-6 max-sm:basis-full' },
  }),
]);
