import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { WEEK } from './calendar-grid';

/** «س ح ن ث ر خ ج» over the columns; hidden from screen readers (each day says its weekday). */
export function WeekdayRow() {
  const { color } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row' }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {WEEK.map((key) => (
        <AppText
          key={key}
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: type.ui[600],
            fontSize: type.size.xs,
            color: color.ink3,
          }}
        >
          {t.datePicker.weekdaysShort[key]}
        </AppText>
      ))}
    </View>
  );
}
