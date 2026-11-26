import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { freeSlotDays, zoneNote, type ViewerClock } from '../../../../lib/time/slots/slot-text';
import { type, useTheme } from '../../../../theme';
import { FilterPills } from '../../FilterPills';
import { FormLabel } from '../../FormLabel';
import { AppText } from '../../../primitives/AppText';
import { SlotButton } from '../SlotButton';

export interface WeekSlotsProps {
  /** The week's slots; a slot with clashes is left out. */
  slots: readonly { starts_at: string; conflicts?: readonly unknown[] }[];
  tz: string;
  viewer: ViewerClock;
  value: string | null;
  onPick: (startsAt: string) => void;
}

/** The week's days with free starts (pills), then the chosen day's free starts. */
export function WeekSlots({ slots, tz, viewer, value, onPick }: WeekSlotsProps) {
  const { color } = useTheme();
  const days = freeSlotDays(slots, viewer.tz);
  const [chosen, setChosen] = useState<string | null>(null);
  const day = days.find((d) => d.date === chosen) ?? days[0];
  const size = type.size.sm;
  const note = {
    fontFamily: type.ui[500],
    fontSize: size,
    lineHeight: type.lineHeight(size),
    color: color.ink2,
  };
  if (!day) return <AppText style={note}>{t.reschedule.noSlots}</AppText>;
  return (
    <>
      <FormLabel>{t.reschedule.pickDay}</FormLabel>
      <FilterPills
        items={days.map((d) => ({ value: d.date, label: d.label }))}
        value={day.date}
        onChange={setChosen}
        accessibilityLabel={t.reschedule.pickDay}
        role="radiogroup"
      />
      <FormLabel>{t.booking.freeSlots}</FormLabel>
      <AppText style={note}>{zoneNote(viewer.tz)}</AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t.booking.freeSlots}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {day.slots.map((slot) => (
          <SlotButton
            key={slot.starts_at}
            startsAt={slot.starts_at}
            tz={tz}
            viewer={viewer}
            selected={slot.starts_at === value}
            onPick={onPick}
          />
        ))}
      </View>
    </>
  );
}
