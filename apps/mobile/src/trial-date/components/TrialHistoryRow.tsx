import type { TrialDateRow } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { pickedLine, trialOutcomeStyle, whenLines } from '../lib/trial-date-text';

interface TrialHistoryRowProps {
  row: TrialDateRow;
  /** The family's zone: its own clock under the viewer's when it differs. */
  familyTz: string;
}

/**
 * One picked trial time, compact: when (the viewer's clock, the family's under it when it differs),
 * the teacher, who picked it and when, and the outcome chip at the inline-end.
 */
export function TrialHistoryRow({ row, familyTz }: TrialHistoryRowProps) {
  const { color } = useTheme();
  const { when, family } = whenLines(row.starts_at, familyTz);
  const small = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  return (
    <View
      testID={`trial-row-${row.lesson_id}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.rule }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink }}>
          {when}
        </AppText>
        {family ? <AppText style={small}>{family}</AppText> : null}
        {row.teacher ? <AppText style={small}>{row.teacher.name}</AppText> : null}
        <AppText style={small}>{pickedLine(row)}</AppText>
      </View>
      <StatusChip {...trialOutcomeStyle[row.outcome]} label={t.trialDate.outcome[row.outcome]} size="sm" />
    </View>
  );
}
