import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';

interface NativePickerProps {
  mode: 'date' | 'time';
  value: Date;
  /** The allowed days (date mode): the bounds the API checks; none = open-ended. */
  min?: Date | undefined;
  max?: Date | undefined;
  onPick: (at: Date) => void;
  onClose: () => void;
}

/**
 * Expo's own picker (@expo/ui DateTimePicker: the Material 3 date / time dialog on Android, SwiftUI
 * on iOS), mounted only while open: it opens on mount, confirming calls onPick and cancelling
 * onClose, and the caller unmounts it after either. 12 / 24 h follows «تنسيق الوقت»; the academy's
 * accent tints it.
 */
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
