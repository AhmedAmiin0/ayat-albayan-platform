import { effective, suggestOverall } from '@ab/shared';
import { fillSlots } from '@ab/client-core';
import { t } from '@/core/lib/i18n/i18n';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';
import { GradePills } from '../ui/GradePills';

/** «التقدير العام»: preselected from the rows' grades until the teacher picks one. */
export function OverallCard({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  const suggested = suggestOverall(s.values.program, s.values.content);
  const shown = effective(s.values, v2.suggest).overall;
  return (
    <Card
      title={v2.overall}
      aside={suggested ? fillSlots(v2.suggested, { grade: t.enums.grade[suggested] }) : null}
    >
      <GradePills
        title={v2.overall}
        value={shown}
        onChange={(overall) => s.update({ overall })}
        disabled={s.locked}
      />
    </Card>
  );
}
