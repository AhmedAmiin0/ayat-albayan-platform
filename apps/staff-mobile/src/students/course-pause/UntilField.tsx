import { addDays } from '@ab/time';
import { Switch, View } from 'react-native';
import { StartDayPicker } from '@/assistants';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';
import { Note } from '@/more';

interface UntilFieldProps {
  /** The pause's first day: the end is never before it. */
  from: string;
  /** Null means until the course resumes. */
  until: string | null;
  onChange: (until: string | null) => void;
}

/** A week from the start when the end is switched on; the steppers move it from there. */
const DEFAULT_SPAN_DAYS = 6;

/** Off runs until resume; the day uses steppers, never typed (rule 6), never before `from`. */
export function UntilField({ from, until, onChange }: UntilFieldProps) {
  const { color } = useTheme();
  const c = t.coursePause;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{c.until}</AppText>
        <Switch
          accessibilityLabel={c.until}
          value={until !== null}
          onValueChange={(on) => onChange(on ? addDays(from, DEFAULT_SPAN_DAYS) : null)}
        />
      </View>
      {until === null ? (
        <Note>{c.untilHint}</Note>
      ) : (
        <StartDayPicker label={c.changeUntilTitle} day={until < from ? from : until} min={from} onChange={onChange} />
      )}
    </View>
  );
}
