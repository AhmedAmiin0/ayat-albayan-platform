import { memo, useCallback } from 'react';
import { earningStatusStyle, type TeacherEarningView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { egp, sessionDetail, sessionWhen } from '../lib/format';
import { useClockCycle } from '@/core/lib/clock';

interface SessionItemProps {
  row: TeacherEarningView;
  /** Admin only: tick the session for the next payment. A teacher's list has no ticks. */
  checked?: boolean;
  /** Stable (useCallback): the row hands itself back. */
  onToggle?: (row: TeacherEarningView) => void;
}

function Tick({ checked, disabled }: { checked: boolean; disabled: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: shape.radius.sm,
        borderWidth: 2,
        borderColor: checked ? color.lapis : color.ruleInput,
        backgroundColor: checked ? color.lapis : 'transparent',
        opacity: disabled ? 0.4 : 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <AppText style={{ color: color.onLapis, fontSize: type.size.sm, lineHeight: 18 }}>✓</AppText> : null}
    </View>
  );
}

/** One session: when, length and students, what it earned and still owes, its status. */
export const SessionItem = memo(function SessionItem({ row, checked = false, onToggle }: SessionItemProps) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const payable = row.outstanding > 0;
  const toggle = useCallback(() => onToggle?.(row), [onToggle, row]);
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      {onToggle ? <Tick checked={checked} disabled={!payable} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {sessionWhen(row.starts_at, cycle)}
        </AppText>
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>{sessionDetail(row)}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {egp(payable ? row.outstanding : row.amount)}
        </AppText>
        <StatusChip {...earningStatusStyle[row.status]} label={t.earnings.statusName[row.status]} size="sm" />
      </View>
    </View>
  );
  if (!onToggle) return body;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={t.earnings.selectRow.replace('{date}', sessionWhen(row.starts_at, cycle))}
      accessibilityState={{ checked, disabled: !payable }}
      disabled={!payable}
      onPress={toggle}
    >
      {body}
    </Pressable>
  );
});
