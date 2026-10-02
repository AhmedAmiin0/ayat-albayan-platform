import type { PayoutGenerateResult } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';

/** «45 والـ60» for the sentence «سعر حلقة الـ{durations} دقيقة …». */
export function durationsText(durations: readonly number[]): string {
  return durations.join(' والـ');
}

/**
 * Teachers left out of the month for a missing rate (R-PAY-02): one sentence each, with the way
 * to the teacher's file where the rate is set.
 */
export function MissingRates({ items }: { items: PayoutGenerateResult['missing_rates'] }) {
  return items.map((m) => (
    <FormAlert key={m.teacher_id} className="mb-2">
      {t.payouts.ratesMissing.replace('{durations}', durationsText(m.durations)).replace('{teacher}', m.display_name_ar)}{' '}
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
