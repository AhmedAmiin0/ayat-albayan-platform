import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/core/lib/money/format';
import { Note } from '@/core/ui/feedback/Note';
import { NativePicker } from './NativePicker';
import { PickerRow } from './PickerRow';
import { dateToDay, dayToDate } from './picker-values';

/** The allowed days, «YYYY-MM-DD», both ends included; no max = open-ended. */
interface DayRange {
  min: string;
  max?: string | undefined;
}

interface DatePickerFieldProps {
  label: string;
  /** YYYY-MM-DD, or '' while none is picked. */
  day: string;
  range: DayRange;
  onChange: (day: string) => void;
  error?: string | undefined;
  /** «اليوم 1 · التاريخ»: several on one screen need their own. */
  testID?: string;
  required?: boolean;
  /** Under the field: «أول تاريخ مسموح: …» (the default) or the caller's own line; null = none. */
  note?: string | null;
}

/**
 * A day picked on Expo's native date dialog (rule 6, never typed; owner 2026-11-07): the day in an
 * input-like row, a tap mounts the dialog bounded by `range` (the days the API accepts), confirming
 * sends YYYY-MM-DD, either button unmounts it.
 */
export function DatePickerField(props: DatePickerFieldProps) {
  const { label, day, range, onChange, error, testID = 'date-picker-open', required, note } = props;
  const [open, setOpen] = useState(false);
  const pick = (at: Date) => {
    setOpen(false);
    onChange(dateToDay(at));
  };
  const line = note === undefined ? t.datePicker.earliest.replace('{date}', localDay(range.min)) : note;
  return (
    <View style={{ gap: 6, flexGrow: 1, flexBasis: 140 }}>
      <PickerRow
        label={label}
        text={day === '' ? t.lessonTimes.pickDate : localDay(day)}
        empty={day === ''}
        hint={t.datePicker.title}
        onPress={() => setOpen(true)}
        error={error}
        testID={testID}
        required={required}
      />
      {line ? <Note>{line}</Note> : null}
      {open ? (
        <NativePicker
          mode="date"
          value={dayToDate(day === '' ? range.min : day)}
          min={dayToDate(range.min)}
          max={range.max === undefined ? undefined : dayToDate(range.max)}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}
