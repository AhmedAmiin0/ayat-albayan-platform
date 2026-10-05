import type { DashboardSummary } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { Bar } from './Bar';

type Load = DashboardSummary['teacher_load'][number];

/** «4 من 12», or the count alone when the teacher has no maximum. */
export function loadLabel(l: Pick<Load, 'students' | 'max_students'>): string {
  return l.max_students === null
    ? String(l.students)
    : t.dashboard.ofMax.replace('{n}', String(l.students)).replace('{max}', String(l.max_students));
}

/**
 * Teacher load (R-RPT-01): assigned trial/active students against the teacher's maximum (a meter:
 * the bar fills toward max_students) and this week's lessons. Neutral ink; a full teacher is not
 * the admin's work, so no saffron.
 */
export function TeacherLoad({ rows }: { rows: readonly Load[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-2">{t.teachers.empty}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t.dashboard.teacherLoad}</caption>
      <thead>
        <tr className="border-b border-rule text-xs font-semibold text-ink-3">
          <th scope="col" className="py-2 pe-3 text-start font-semibold">{t.payouts.teacher}</th>
          <th scope="col" className="py-2 pe-3 text-start font-semibold">{t.teachers.studentsCount}</th>
          <th scope="col" className="py-2 text-end font-semibold">{t.dashboard.weekLessons}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.teacher_id} className="border-b border-rule last:border-b-0">
            <th scope="row" className="py-2 pe-3 text-start font-semibold whitespace-nowrap">
              <Link to="/admin/teachers/$teacherId" params={{ teacherId: r.teacher_id }} className="text-ink hover:text-lapis">
                {r.display_name_ar}
              </Link>
            </th>
            <td className="py-2 pe-3">
              <span className="flex items-center gap-3">
                <span className="relative block h-2.5 min-w-12 flex-1 rounded-e-[4px] bg-rule">
                  <Bar value={r.students} max={r.max_students ?? r.students} className="absolute inset-0" />
                </span>
                <span className="min-w-14 text-end tabular-nums">{loadLabel(r)}</span>
              </span>
            </td>
            <td className="py-2 text-end font-semibold tabular-nums">{r.lessons}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
