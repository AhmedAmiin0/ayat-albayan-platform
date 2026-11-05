import { t } from '@/core/lib/i18n/i18n';
import { MenuSheet } from '@/core/ui/feedback/MenuSheet';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { CalendarMonth } from './CalendarMonth';
import type { DayRange } from './calendar-grid';

interface DatePickerSheetProps {
  value: string;
  range: DayRange & { today: string };
  onPick: (day: string) => void;
  onClose: () => void;
}

/** The calendar in the app's bottom sheet: a tap outside closes it, a picked day closes it too. */
export function DatePickerSheet({ value, range, onPick, onClose }: DatePickerSheetProps) {
  const { color } = useTheme();
  return (
    <MenuSheet open label={t.datePicker.title} testID="date-picker-sheet" onClose={onClose}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}
      >
        {t.datePicker.title}
      </AppText>
      <CalendarMonth value={value} range={range} onPick={onPick} />
    </MenuSheet>
  );
}
