import { Link } from '@tanstack/react-router';
import { Ltr } from '@/components/ui/display/ltr';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { dayMonthLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { amount, currencyLabel } from './format';
import { workItem, workLink } from './PendingReportsList';
import type { UnpaidRow } from './types';
import { packageText } from './work-text';

/**
 * Packages with status «مش مدفوع» (R-SUB-02), oldest first; each opens the student's file. A row
 * says what is due: the money still owed, or a renewal (paid in full and used up).
 */
export function UnpaidList({ items }: { items: readonly UnpaidRow[] }) {
  if (items.length === 0) return <p className="py-3 text-sm text-ink-2">{t.dashboard.noUnpaid}</p>;
  return (
    <ul>
      {items.map((r) => (
        <li key={r.id} className={workItem}>
          <NuqtaGlyph shape="hollow" className="size-[9px] shrink-0 text-act" />
          <span className="font-semibold">{r.student.name}</span>
          {r.student.code && <Ltr className="text-2xs text-ink-3">{r.student.code}</Ltr>}
          <span className="text-xs text-ink-2">
            {packageText(r)} · {t.subscriptions.startsOn} {dayMonthLabel(r.starts_on)} ·{' '}
            {r.reason === 'owes' ? (
              <>
                {t.dashboard.owes} <bdi dir="ltr" className="tabular-nums">{amount(r.owed)}</bdi> {currencyLabel(r.currency)}
              </>
            ) : (
              t.dashboard.renewalDue
            )}
          </span>
          <Link
            to="/admin/students/$studentId"
            params={{ studentId: r.student.id }}
            aria-label={t.students.openProfile.replace('{name}', r.student.name)}
            className={workLink}
          >
            {t.students.profile}
          </Link>
        </li>
      ))}
    </ul>
  );
}
