import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ReportTextField } from '../../components/ReportTextField';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';

/**
 * Absent or excused: no content and no grades, only whether the lesson counts against the package
 * and an optional note to the family.
 */
export function AbsentCard({ s }: { s: V2EntryState }) {
  const { color } = useTheme();
  const v2 = t.reports.v2;
  const absent = s.values.attendance === 'absent';
  return (
    <Card title={absent ? v2.attendance.absent : v2.excusedTitle}>
      <AppText
        style={{
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
        }}
      >
        {v2.absentHint}
      </AppText>
      <View>
        <StatusChip
          tone={absent ? 'act' : 'ok'}
          glyph={absent ? 'fill' : 'hollow'}
          label={absent ? v2.charged : v2.notCharged}
        />
      </View>
      <ReportTextField
        label={v2.absentNote}
        placeholder={v2.absentNotePlaceholder}
        value={s.values.notes}
        onChange={(notes) => s.update({ notes })}
        disabled={s.locked}
      />
    </Card>
  );
}
