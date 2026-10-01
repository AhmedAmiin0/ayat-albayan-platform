import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { Ltr } from '@/ui/Ltr';
import { slotRange, weekdayName, type WeekdaySlots } from './schedule';
import { AppText } from '@/ui/AppText';

/** «الاتنين   16:00 – 18:00   20:00 – 22:00»: the day, then its ranges (wrapping). */
export function WeekdayRow({ day }: { day: WeekdaySlots }) {
  const { color } = useTheme();
  const text = { fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
      }}
    >
      <AppText style={[text, { width: 84, fontFamily: type.ui[600] }]}>{weekdayName(day.weekday)}</AppText>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
        {day.slots.map((slot) => (
          <Ltr key={slot.id} style={[text, { fontFamily: type.ui[500] }]}>
            {slotRange(slot)}
          </Ltr>
        ))}
      </View>
    </View>
  );
}
