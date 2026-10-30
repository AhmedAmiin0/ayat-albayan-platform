import { effective } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { ReportTextField } from '../../components/ReportTextField';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';

/** «الواجب قبل الحلقة القادمة»: prefilled from today's parts (a Quran lesson), editable. */
export function HomeworkCard({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  return (
    <Card>
      <ReportTextField
        label={v2.homework}
        value={effective(s.values, v2.suggest).homework}
        onChange={(homework) => s.update({ homework })}
        disabled={s.locked}
      />
      <Note>{v2.homeworkHint}</Note>
    </Card>
  );
}
