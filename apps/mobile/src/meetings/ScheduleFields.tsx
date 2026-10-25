import { MEETING_DURATION_MAX, MEETING_DURATION_MIN } from '@ab/shared';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Note } from '@/more/Note';
import { Stepper } from '@/pricing/Stepper';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { dayChipLabel, minutesText, tzNote } from './invite-text';
import { dateChoices, type Slot } from './schedule-time';

const L = t.meetingInvites;
const two = (n: number) => String(n).padStart(2, '0');

export interface ScheduleFieldsProps {
  slot: Slot;
  onChange: (slot: Slot) => void;
  /** The viewer's zone: the chips are its days, the steppers its wall clock. */
  tz: string;
}

/**
 * The time of a scheduled meeting without a date picker: 14 day chips (today first, the viewer's
 * calendar), hour ±1 and minute ±15 steppers, a length of 15..240 by 15, and the zone it reads in.
 */
export function ScheduleFields({ slot, onChange, tz }: ScheduleFieldsProps) {
  const { color } = useTheme();
  const days = useMemo(() => dateChoices(new Date(), tz), [tz]);
  const items = days.map((d, i) => ({ value: d, label: dayChipLabel(d, i === 0) }));
  if (!days.includes(slot.date)) items.unshift({ value: slot.date, label: dayChipLabel(slot.date, false) });
  const set = (patch: Partial<Slot>) => onChange({ ...slot, ...patch });
  const caption = { fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 };
  return (
    <View style={{ gap: 10 }}>
      <AppText style={caption}>{L.date}</AppText>
      <FilterPills items={items} value={slot.date} onChange={(date) => set({ date })} accessibilityLabel={L.date} role="radiogroup" />
      <AppText style={caption}>{L.time}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <Stepper label={L.mobile.hour} value={slot.hour} min={0} max={23} wrap format={two} onChange={(hour) => set({ hour })} />
        <Stepper label={L.mobile.minute} value={slot.minute} min={0} max={45} step={15} wrap format={two} onChange={(minute) => set({ minute })} />
      </View>
      <AppText style={caption}>{L.duration}</AppText>
      <Stepper
        label={L.duration}
        value={slot.durationMin}
        min={MEETING_DURATION_MIN}
        max={MEETING_DURATION_MAX}
        step={15}
        format={minutesText}
        onChange={(durationMin) => set({ durationMin })}
      />
      <Note>{tzNote(tz)}</Note>
    </View>
  );
}
