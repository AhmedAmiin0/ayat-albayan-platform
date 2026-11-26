import { Pressable, View } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import { Chevron } from '../../../primitives/Chevron';
import { SquareButton } from '../SquareButton';

/** The period's label: body size, semibold, tabular digits. */
const headStyle = (ink: string) => ({
  color: ink,
  fontFamily: type.ui[600],
  fontSize: type.size.body,
  lineHeight: type.lineHeight(type.size.body),
  fontVariant: ['tabular-nums' as const],
});

export interface PeriodSwitcherProps {
  label: string;
  /** The shown period holds today, so there is no jump-to-today. */
  current: boolean;
  /** false: nothing earlier to show (a slot picker never goes before this week). Default true. */
  canPrev?: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Arrows mirrored in RTL (docs/07 §14.8); the today pill is 28pt with a 44pt hit area. */
export function PeriodSwitcher(props: PeriodSwitcherProps) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Arrow label={props.prevLabel} to="prev" onPress={props.onPrev} disabled={props.canPrev === false} />
      <AppText
        accessibilityRole="header"
        style={{ flex: 1, textAlign: 'center', ...headStyle(color.ink) }}
      >
        {props.label}
      </AppText>
      {props.current ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={props.onToday}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: shape.radius.pill,
            backgroundColor: color.lapisWash,
          }}
        >
          <AppText
            style={{
              fontFamily: type.ui[600],
              fontSize: type.size.xs,
              lineHeight: 20,
              color: color.lapis,
            }}
          >
            {t.schedule.today}
          </AppText>
        </Pressable>
      )}
      <Arrow label={props.nextLabel} to="next" onPress={props.onNext} />
    </View>
  );
}

interface ArrowProps {
  label: string;
  to: 'prev' | 'next';
  onPress: () => void;
  disabled?: boolean;
}

function Arrow({ label, to, onPress, disabled = false }: ArrowProps) {
  const { color } = useTheme();
  return (
    <SquareButton label={label} onPress={onPress} disabled={disabled}>
      <Chevron to={to} color={color.ink} />
    </SquareButton>
  );
}
