import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useClockCycle } from '@/core/lib/clock';
import { t, useTheme } from '@ab/mobile-kit';

interface NativePickerProps {
  mode: 'date' | 'time';
  value: Date;
  /** The allowed days (date mode): the bounds the API checks; none = open-ended. */
  min?: Date | undefined;
  max?: Date | undefined;
  onPick: (at: Date) => void;
  onClose: () => void;
}

/** Mounted only while open; the caller unmounts it after confirm or cancel. */
export function NativePicker(props: NativePickerProps) {
  const { mode, value, min, max, onPick, onClose } = props;
  const cycle = useClockCycle();
  const { color } = useTheme();
  const range = { ...(min ? { minimumDate: min } : {}), ...(max ? { maximumDate: max } : {}) };
  return (
    <DateTimePicker
      presentation="dialog"
      mode={mode}
      value={value}
      {...range}
      is24Hour={cycle === '24'}
      accentColor={color.lapis}
      positiveButton={{ label: t.lessonTimes.ok }}
      negativeButton={{ label: t.common.cancel }}
      onValueChange={(_event, at) => onPick(at)}
      onDismiss={onClose}
    />
  );
}
