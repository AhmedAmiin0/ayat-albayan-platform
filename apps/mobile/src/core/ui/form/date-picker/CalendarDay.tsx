import { Pressable } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { dayNumber, daySpoken } from './calendar-text';

interface CalendarDayProps {
  day: string;
  /** The week column, 0 = السبت (for the spoken weekday). */
  column: number;
  state: { selected: boolean; allowed: boolean; today: boolean };
  onPick: (day: string) => void;
}

/** One day of the grid, 44pt: the picked day filled lapis, today ringed, out of range dimmed. */
export function CalendarDay({ day, column, state, onPick }: CalendarDayProps) {
  const { color } = useTheme();
  const { selected, allowed, today } = state;
  return (
    <Pressable
      testID={`calendar-day-${day}`}
      accessibilityRole="button"
      accessibilityLabel={daySpoken(day, column)}
      accessibilityState={{ selected, disabled: !allowed }}
      disabled={!allowed}
      onPress={() => onPick(day)}
      style={{
        flex: 1,
        height: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.pill,
        borderWidth: today && !selected ? 1 : 0,
        borderColor: color.lapis,
        backgroundColor: selected ? color.lapis : 'transparent',
        opacity: allowed ? 1 : 0.3,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[selected ? 700 : 600],
          fontSize: type.size.sm,
          color: selected ? color.onLapis : color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {dayNumber(day)}
      </AppText>
    </Pressable>
  );
}
