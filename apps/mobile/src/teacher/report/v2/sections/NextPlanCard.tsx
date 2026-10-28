import { effective } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ReportTextField } from '../../components/ReportTextField';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';

/** «الحلقة القادمة»: the suggested plan, read-only until «تعديل الخطة» opens it for editing. */
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
