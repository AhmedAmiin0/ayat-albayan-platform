import type { TeacherEarningsSummaryView } from '@ab/money';
import { Link } from '@tanstack/react-router';
import { formatDate } from '@/features/sales/leads';
import { Amount } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';

const row = 'flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-rule py-2.5 text-sm';

/** The loaded dues: the total owed, then one row per teacher linked to their earnings page. */
export function DuesBody({ summary }: { summary: TeacherEarningsSummaryView }) {
  const { rows, totals } = summary;
  return (
    <section aria-label={t.finance.duesTitle} className="mb-8 grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h2 className="text-base font-semibold text-ink">{t.finance.duesTitle}</h2>
        <p className="flex items-baseline gap-2 text-sm">
          <span className="text-ink-3">{t.finance.owedTotal}</span>
          <Amount amount={totals.owed} currency="EGP" className="text-lg font-semibold" />
        </p>
        <p className="text-xs text-ink-3">
          {t.finance.teachersOwed.replace('{count}', String(totals.teachers_owed))}
        </p>
      </div>
      {rows.length === 0 && <p className="text-sm text-ink-3">{t.earnings.empty}</p>}
      <ul className="grid">
        {rows.map((r) => (
          <li key={r.teacher.id} className={row}>
            <Link
              to="/admin/teachers/$teacherId/earnings"
              params={{ teacherId: r.teacher.id }}
              className="min-w-40 font-semibold text-ink underline-offset-4 hover:underline"
            >
              {teacherLabel(r.teacher)}
            </Link>
            <span className="text-ink-3">
              {t.earnings.earned}: <Amount amount={r.earned} currency="EGP" />
            </span>
            <span className="text-ink-3">
              {t.earnings.paid}: <Amount amount={r.paid} currency="EGP" />
            </span>
            <span className="font-semibold text-ink">
              {t.earnings.outstanding}: <Amount amount={r.owed} currency="EGP" />
            </span>
            {r.oldest_unpaid_at && (
              <span className="text-xs text-ink-3">
                {t.finance.oldestUnpaid.replace('{date}', formatDate(r.oldest_unpaid_at))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
