import { addDays } from '@ab/shared';
import { Switch, View } from 'react-native';
import { StartDayPicker } from '@/assistants';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface UntilFieldProps {
  /** The pause's first day: the end is never before it. */
  from: string;
  /** null = until «استئناف الدورة». */
  until: string | null;
  onChange: (until: string | null) => void;
}

/** A week from the start when the end is switched on; the steppers move it from there. */
const DEFAULT_SPAN_DAYS = 6;

/**
 * «آخر يوم في الإيقاف (اختياري)»: off = the pause runs until «استئناف» (the hint says so); on = the last paused
 * day with the app's day steppers (rule 6, never typed), never before `from`.
 */
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
