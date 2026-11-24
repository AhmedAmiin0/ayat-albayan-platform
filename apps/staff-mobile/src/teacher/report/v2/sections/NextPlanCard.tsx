import { effective } from '@ab/shared';
import { useState } from 'react';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { ReportTextField } from '@/teacher/report/components/ReportTextField';
import type { V2EntryState } from '@/teacher/report/v2/hooks/use-v2-entry';
import { Card } from '@/teacher/report/v2/ui/Card';

/** Read-only until the plan edit opens it. */
export function NextPlanCard({ s }: { s: V2EntryState }) {
  const { color } = useTheme();
  const v2 = t.reports.v2;
  const [editing, setEditing] = useState(false);
  const plan = effective(s.values, v2.suggest).nextPlan;
  return (
    <Card title={v2.nextTitle} tone="wash">
      {editing ? (
        <ReportTextField
          label={v2.nextTitle}
          value={plan}
          onChange={(nextPlan) => s.update({ nextPlan })}
          disabled={s.locked}
        />
      ) : plan ? (
        <AppText
          style={{
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.ink2,
          }}
        >
          {plan}
        </AppText>
      ) : null}
      {s.locked ? null : (
        <Button variant="ghost" label={v2.editPlan} onPress={() => setEditing((e) => !e)} />
      )}
    </Card>
  );
}
