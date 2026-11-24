import { Pressable, View } from 'react-native';
import { t, shape, type, useTheme, AppText, Chevron } from '@ab/mobile-kit';
import { monthTitle } from './calendar-text';

interface MonthHeaderProps {
  month: string;
  /** Which arrows lead to a month that still holds an allowed day. */
  can: { prev: boolean; next: boolean };
  onStep: (delta: -1 | 1) => void;
}

const STEP: Record<'prev' | 'next', -1 | 1> = { prev: -1, next: 1 };

/** Past the range an arrow is dimmed. */
export function MonthHeader({ month, can, onStep }: MonthHeaderProps) {
  const { color } = useTheme();
  const arrow = (dir: 'prev' | 'next') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.mobileFinance.month[dir]}
      accessibilityState={{ disabled: !can[dir] }}
      disabled={!can[dir]}
      onPress={() => onStep(STEP[dir])}
      style={{
        width: shape.control.touch,
        height: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: can[dir] ? 1 : 0.3,
      }}
    >
      <Chevron to={dir} color={color.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {arrow('prev')}
      <AppText
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.base,
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {monthTitle(month)}
      </AppText>
      {arrow('next')}
    </View>
  );
}
