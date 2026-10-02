import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { WEEK_ORDER } from './qualification-form';

const weekday: Record<string, string> = t.enums.weekday;

export interface DayChipsProps {
  /** Picked weekdays (0 = الأحد), sorted. */
  value: readonly number[];
  onChange: (days: number[]) => void;
}

/** «الأيام المتاحة»: one checkbox chip per day, السبت → الجمعة, any number of them (R-LEAD-03). */
export function DayChips({ value, onChange }: DayChipsProps) {
  const { color } = useTheme();
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  return (
    <View
      accessibilityLabel={t.leads.availableDays}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
    >
      {WEEK_ORDER.map((day) => {
        const on = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={weekday[String(day)]}
            onPress={() => toggle(day)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
              minHeight: 36,
              justifyContent: 'center',
              paddingHorizontal: 14,
              borderRadius: shape.radius.pill,
              borderWidth: 1,
              borderColor: on ? color.inverse : color.rule,
              backgroundColor: on ? color.inverse : color.raised,
            }}
          >
            <AppText
              style={{
                fontFamily: type.ui[600],
                fontSize: type.size.sm,
                lineHeight: 22,
                color: on ? color.onInverse : color.ink,
              }}
            >
              {weekday[String(day)]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
