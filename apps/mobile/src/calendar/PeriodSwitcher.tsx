import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';

export interface PeriodSwitcherProps {
  /** «3 أكتوبر – 9 أكتوبر» or «الخميس 1 أكتوبر». */
  label: string;
  /** The shown week/day holds today: no «النهارده» jump. */
  current: boolean;
  /** false: nothing earlier to show (a slot picker never goes before this week). Default true. */
  canPrev?: boolean;
  /** «الأسبوع اللي فات» / «اليوم اللي فات»: the arrows' spoken names. */
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/**
 * ‹ label › with 44pt arrows (earlier at the inline-start, mirrored in RTL, docs/07 §14.8), and
 * «النهارده» when the shown period is elsewhere: a 28pt pill with a 44pt hit area.
 */
export function PeriodSwitcher(props: PeriodSwitcherProps) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Arrow label={props.prevLabel} to="prev" onPress={props.onPrev} disabled={props.canPrev === false} />
      <AppText
        accessibilityRole="header"
        style={{
          flex: 1,
          textAlign: 'center',
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {props.label}
      </AppText>
      {props.current ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={props.onToday}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: shape.radius.pill, backgroundColor: color.lapisWash }}
        >
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.lapis }}>
            {t.schedule.today}
          </AppText>
        </Pressable>
      )}
      <Arrow label={props.nextLabel} to="next" onPress={props.onNext} />
    </View>
  );
}

type ArrowProps = { label: string; to: 'prev' | 'next'; onPress: () => void; disabled?: boolean };

function Arrow({ label, to, onPress, disabled = false }: ArrowProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : 1,
        width: shape.control.touch,
        height: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: pressed ? color.sunk : color.raised,
      })}
    >
      <Chevron to={to} color={color.ink} />
    </Pressable>
  );
}
