import { useState } from 'react';
import { View } from 'react-native';
import { hhmm, useClockCycle } from '@/core/lib/clock';
import { t } from '@ab/mobile-kit';
import { NativePicker } from './NativePicker';
import { PickerRow } from './PickerRow';
import { dateToTime, timeToDate } from './picker-values';

interface TimePickerFieldProps {
  label: string;
  /** «HH:MM» (24 h) on the wall clock the screen names, or '' while none is picked. */
  time: string;
  onChange: (time: string) => void;
  error?: string | undefined;
  testID?: string;
  required?: boolean;
}

/** Rule 6, never typed; the minute is kept as is and the availability check decides. */
export function TimePickerField(props: TimePickerFieldProps) {
  const { label, time, onChange, error, testID = 'time-picker-open', required } = props;
  const cycle = useClockCycle();
  const [open, setOpen] = useState(false);
  const pick = (at: Date) => {
    setOpen(false);
    onChange(dateToTime(at));
  };
  return (
    <View style={{ flexGrow: 1, flexBasis: 140 }}>
      <PickerRow
        label={label}
        text={time === '' ? t.lessonTimes.pickTime : hhmm(time, cycle)}
        empty={time === ''}
        hint={t.lessonTimes.pickTime}
        onPress={() => setOpen(true)}
        error={error}
        testID={testID}
        required={required}
      />
      {open ? (
        <NativePicker mode="time" value={timeToDate(time)} onPick={pick} onClose={() => setOpen(false)} />
      ) : null}
    </View>
  );
}
