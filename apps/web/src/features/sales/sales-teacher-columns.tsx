import type { SalesTeacherView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';

const col = createColumnHelper<DataTableFeatures, SalesTeacherView>();
const programs = (tc: SalesTeacherView): string => tc.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);

// «المعلمون» (sales, read-only): name, gender, programs and the students each teaches. Never pay, rates,
// phone or meeting link (the API does not send them). Stacked under 640px.
export const salesTeacherColumns = col.columns([
  col.accessor('name', {
    header: () => t.sales.teachers.name,
    cell: (c) => <span className="font-semibold">{c.getValue()}</span>,
    meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
  }),
  col.accessor((tc) => t.enums.gender[tc.gender], {
    id: 'gender',
    header: () => t.sales.teachers.gender,
    meta: { className: 'text-ink-2 max-sm:order-2 max-sm:text-sm' },
  }),
  col.accessor(programs, {
    id: 'programs',
    header: () => t.sales.teachers.programs,
    meta: { className: 'text-ink-2 max-sm:order-3 max-sm:text-sm', filter: { kind: 'text' } },
  }),
  // «name code» joined: the filter finds a student by name or code.
  col.accessor((tc) => tc.students.map((s) => `${s.name} ${s.code}`).join(' '), {
    id: 'students',
    header: () => t.sales.teachers.students,
    cell: (c) => {
      const list = c.row.original.students;
      if (list.length === 0) return <span className="text-ink-3">{t.sales.teachers.noStudents}</span>;
      return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {list.map((s) => (
            <li key={s.id} className="inline-flex items-baseline gap-2">
              <span>{s.name}</span>
              <Ltr className="text-xs text-ink-3">{s.code}</Ltr>
            </li>
          ))}
        </ul>
      );
    },
    meta: { className: 'max-sm:order-4 max-sm:basis-full', filter: { kind: 'text' } },
  }),
]);
