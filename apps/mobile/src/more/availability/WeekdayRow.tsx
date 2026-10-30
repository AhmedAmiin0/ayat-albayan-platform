import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { useClockCycle } from '@/core/lib/clock';
import { slotRange, weekdayName, type WeekdaySlots } from '../schedule';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * «الاتنين   16:00 – 18:00   20:00 – 22:00»: the day, then its ranges (wrapping). A row of the week's
 * inset card, which draws the fill and the rules (owner 2026-10-28: one container rule).
 */
export function WeekdayRow({ day }: { day: WeekdaySlots }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const text = { fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <AppText style={[text, { width: 84, fontFamily: type.ui[600] }]}>{weekdayName(day.weekday)}</AppText>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
        {day.slots.map((slot) => (
          <AppText key={slot.id} numberOfLines={1} style={[text, { fontFamily: type.ui[500], fontVariant: ['tabular-nums'] }]}>
            {slotRange(slot, cycle)}
          </AppText>
        ))}
      </View>
    </View>
  );
}
