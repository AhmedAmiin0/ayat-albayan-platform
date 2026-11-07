import type { DayBounds, LessonRow } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { DatePickerField, TimePickerField } from '@/core/ui/form/date-picker';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { shape, type, useTheme } from '@/theme';
import { PickNotice } from './PickNotice';
import type { RowCheck } from './row-check';

interface LessonTimeRowProps {
  /** 0-based: «اليوم 1», and the fields' test ids. */
  index: number;
  row: LessonRow;
  bounds: DayBounds;
  /** Another row already has this weekday. */
  repeated: boolean;
  check: RowCheck;
  /** The student's zone (the row's wall clock). */
  tz: string;
  onChange: (patch: Partial<LessonRow>) => void;
  /** «احذف اليوم 2» when the days a week are not fixed. */
  onRemove?: (() => void) | undefined;
}

const border = (rule: string) => ({
  borderWidth: 1,
  borderColor: rule,
  borderRadius: shape.radius.md,
});

/** One lesson day: its date and its time (Expo's dialogs), the other clocks, then what is known. */
export function LessonTimeRow(props: LessonTimeRowProps) {
  const { index, row, bounds, repeated, check, tz, onChange, onRemove } = props;
  const { color } = useTheme();
  const lt = t.lessonTimes;
  return (
    <View style={{ gap: 10, padding: 12, ...border(color.rule) }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}
      >
        {lt.row.replace('{n}', String(index + 1))}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <DatePickerField
          label={lt.date}
          day={row.date}
          range={bounds}
          note={null}
          required
          error={repeated ? lt.sameDay : undefined}
          testID={`lesson-date-${index}`}
          onChange={(date) => onChange({ date })}
        />
        <TimePickerField
          label={lt.time}
          time={row.time}
          required
          testID={`lesson-time-${index}`}
          onChange={(time) => onChange({ time })}
        />
      </View>
      {check.beside.map((line) => (
        <Note key={line}>{line}</Note>
      ))}
      {onRemove ? (
        <Button variant="ghost" label={lt.removeRow.replace('{n}', String(index + 1))} onPress={onRemove} />
      ) : null}
      {check.state ? (
        <PickNotice
          state={check.state}
          nearest={check.nearest}
          tz={tz}
          onUse={(time) => onChange({ time })}
        />
      ) : null}
    </View>
  );
}
