import type { PayoutGenerateResult } from '@ab/money';
import { Link } from '@tanstack/react-router';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';

export function durationsText(durations: readonly number[]): string {
  return durations.join(t.payouts.durationsJoiner);
}

/**
 * Teachers left out of the month for a missing rate (R-PAY-02): one sentence each, with the way
 * to the teacher's file where the rate is set.
 */
export function MissingRates({ items }: { items: PayoutGenerateResult['missing_rates'] }) {
  return items.map((m) => (
    <FormAlert key={m.teacher_id} className="mb-2">
      {t.payouts.ratesMissing.replace('{durations}', durationsText(m.durations)).replace('{teacher}', teacherLabel(m))}{' '}
      <Link
        to="/admin/teachers/$teacherId"
        params={{ teacherId: m.teacher_id }}
        className="font-semibold underline underline-offset-4"
      >
        {t.payouts.setRate}
      </Link>
    </FormAlert>
  ));
}
