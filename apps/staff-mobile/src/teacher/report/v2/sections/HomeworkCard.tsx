import { effective } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { Note } from '@/more';
import { ReportTextField } from '@/teacher/report/components/ReportTextField';
import type { V2EntryState } from '@/teacher/report/v2/hooks/use-v2-entry';
import { Card } from '@/teacher/report/v2/ui/Card';

/** Prefilled from today's parts on a Quran lesson, editable. */
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
