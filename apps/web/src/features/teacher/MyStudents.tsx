import { studentStatusStyle, type TeacherMe } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { EmptyState } from '@/components/ui/empty-state';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';

/**
 * «طلابي» (R-TCH-03): the teacher's students (assigned or on an active rule), by name; each name
 * opens that student's «سجل التقارير» (R-REP-05).
 */
export function MyStudents({ students }: { students: TeacherMe['students'] }) {
  if (students.length === 0) return <EmptyState title={t.teacherDash.noStudents} />;
  return (
    <table aria-label={t.teacherDash.myStudents} className="w-full text-sm">
      <thead>
        <tr className="border-b-[3px] border-double border-gold text-xs text-ink-3">
          <th scope="col" className="px-2 py-2 text-start font-semibold">{t.students.name}</th>
          <th scope="col" className="px-2 py-2 text-start font-semibold">{t.students.code}</th>
          <th scope="col" className="hidden px-2 py-2 text-start font-semibold sm:table-cell">{t.students.tz}</th>
          <th scope="col" className="px-2 py-2 text-start font-semibold">{t.students.status}</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s) => (
          <tr key={s.id} className="border-b border-rule">
            <th scope="row" className="px-2 py-2.5 text-start font-semibold">
              <Link
                to="/teacher/reports/$studentId"
                params={{ studentId: s.id }}
                title={t.reports.history}
                className="text-lapis underline underline-offset-4"
              >
                {s.name}
              </Link>
            </th>
            <td className="px-2 py-2.5">
              <Ltr className="text-ink-2">{s.code}</Ltr>
            </td>
            <td className="hidden px-2 py-2.5 text-ink-2 sm:table-cell">{tzCity(s.tz) ?? <Ltr>{s.tz}</Ltr>}</td>
            <td className="px-2 py-2.5">
              <StatusChip size="sm" {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
