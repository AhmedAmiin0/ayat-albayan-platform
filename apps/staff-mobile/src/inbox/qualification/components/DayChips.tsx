import { Pressable, View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { WEEK_ORDER } from '@/inbox/qualification/lib/qualification-form';

const weekday: Record<string, string> = t.enums.weekday;

interface DayChipsProps {
  /** Sunday is 0; sorted. */
  value: readonly number[];
  onChange: (days: number[]) => void;
  /** The picked slot's weekday: always on, not a toggle (a series repeats on it), with a note. */
  locked?: number;
  accessibilityLabel?: string;
}

/** R-LEAD-03: any number of days. */
export function DayChips({
  value,
  onChange,
  locked,
  accessibilityLabel = t.leads.availableDays,
}: DayChipsProps) {
  const { color } = useTheme();
  const toggle = (day: number) =>
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b),
    );
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityLabel={accessibilityLabel}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {WEEK_ORDER.map((day) => {
          const fixed = day === locked;
          const on = fixed || value.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: fixed }}
              accessibilityLabel={weekday[String(day)]}
              disabled={fixed}
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
      {locked === undefined ? null : (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.ink2,
          }}
        >
          {t.booking.dayLocked}
        </AppText>
      )}
    </View>
  );
}
