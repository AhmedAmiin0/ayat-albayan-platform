import { fillSlots } from '@ab/client-core';
import type { Grade } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { GradeChips } from '../GradeChips';
import { CARD } from '../v2-classes';

export interface OverallCardProps {
  name: string;
  /** What the form shows: the teacher's grade, else the suggestion. */
  value: Grade | null;
  /** «مقترح من التقييمات» (suggestOverall), null until a row is graded. */
  suggested: Grade | null;
  onChange: (grade: Grade) => void;
  invalid: boolean;
}

/** «التقدير العام»: prefilled from the rows' grades until the teacher picks one. */
export function OverallCard({ name, value, suggested, onChange, invalid }: OverallCardProps) {
  return (
    <section aria-label={t.reports.v2.overall} className={CARD}>
      <GradeChips name={name} label={t.reports.v2.overall} value={value} onChange={onChange} invalid={invalid} />
      {suggested && (
        <p className="text-xs text-ink-3">{fillSlots(t.reports.v2.suggested, { grade: t.enums.grade[suggested] })}</p>
      )}
    </section>
  );
}
