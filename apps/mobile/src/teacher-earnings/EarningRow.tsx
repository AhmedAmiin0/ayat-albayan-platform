import type { TeacherEarningView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { StatusChip } from '@/ui/StatusChip';
import { earningStatusStyle, sessionMoney, sessionTitle } from './text';

export interface EarningRowProps {
  earning: TeacherEarningView;
  /** Admin only: the tick box. Omitted = a plain read-only row (the teacher's screen). */
  selected?: boolean;
  onToggle?: () => void;
}

function Tick({ on, disabled }: { on: boolean; disabled: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.sm,
        borderWidth: 1,
        borderColor: on ? color.lapis : color.ruleInput,
        backgroundColor: on ? color.lapis : color.raised,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {on ? <AppText style={{ color: color.onLapis, fontFamily: type.ui[700], lineHeight: 20 }}>✓</AppText> : null}
    </View>
  );
}

/** One session: day + minutes, the money, its status chip; with `onToggle` a tick box in front. */
export function EarningRow({ earning, selected = false, onToggle }: EarningRowProps) {
  const { color } = useTheme();
  const open = earning.outstanding > 0;
  const body = (
    <>
      {onToggle ? <Tick on={selected} disabled={!open} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
          {sessionTitle(earning)}
        </AppText>
        <Note>{sessionMoney(earning)}</Note>
      </View>
      <StatusChip {...earningStatusStyle[earning.status]} label={t.teacherEarnings.status[earning.status]} size="sm" />
    </>
  );
  const row = {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
    backgroundColor: color.raised,
  } as const;
  if (!onToggle) return <View style={row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${t.teacherEarnings.selectRow}: ${sessionTitle(earning)}`}
      accessibilityState={{ checked: selected, disabled: !open }}
      disabled={!open}
      onPress={onToggle}
      style={row}
    >
      {body}
    </Pressable>
  );
}
