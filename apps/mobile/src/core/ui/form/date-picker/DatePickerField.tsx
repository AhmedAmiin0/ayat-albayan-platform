import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/core/lib/money/format';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { shape, type, useTheme } from '@/theme';
import { FormLabel } from '@/core/ui/form/FormLabel';
import type { DayRange } from './calendar-grid';
import { DatePickerSheet } from './DatePickerSheet';

interface DatePickerFieldProps {
  label: string;
  /** YYYY-MM-DD (an academy day). */
  day: string;
  /** min/max: the allowed days; today: the academy's (Riyadh) day, ringed in the grid. */
  range: DayRange & { today: string };
  onChange: (day: string) => void;
  error?: string | undefined;
}

/**
 * A day chosen on an in-app calendar (rule 6, never typed; no native date picker: the app
 * updates over the air): the day in an input-like row, a tap opens the month sheet, picking a day
 * closes it.
 */
export function DatePickerField({ label, day, range, onChange, error }: DatePickerFieldProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const pick = (next: string) => {
    setOpen(false);
    onChange(next);
  };
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <Pressable
        testID="date-picker-open"
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${t.datePicker.change.replace('{date}', localDay(day))}`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: shape.control.touch,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: error ? color.bad : color.ruleInput,
          borderRadius: shape.radius.md,
          backgroundColor: color.raised,
        }}
      >
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.base,
            color: color.ink,
            fontVariant: ['tabular-nums'],
          }}
        >
          {localDay(day)}
        </AppText>
        <Chevron to="down" color={color.ink2} />
      </Pressable>
      <Note>{t.datePicker.earliest.replace('{date}', localDay(range.min))}</Note>
      {error ? <ErrorLine message={error} /> : null}
      {open ? (
        <DatePickerSheet value={day} range={range} onPick={pick} onClose={() => setOpen(false)} />
      ) : null}
    </View>
  );
}
