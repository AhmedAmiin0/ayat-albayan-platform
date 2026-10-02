import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { freeSlotDays, slotLegend, whenText } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { useRescheduleSlots } from './queries';
import { SlotButton } from './SlotButton';

export interface SlotPickerProps {
  lesson: LessonView;
  durationMin: number;
  /** The family's zone: the small clocks. */
  tz: string;
  /** starts_at of the picked slot. */
  value: string | null;
  onPick: (startsAt: string) => void;
}

/**
 * «الميعاد الجديد» (R-SCH-07): a day with free starts in the next 14 days, then one of its free
 * starts, then «الميعاد اللي اخترته: …». Only clash-free slots are offered (the teacher's lessons,
 * time-off and availability, and the students' other lessons); nothing is typed (rule 6).
 */
export function SlotPicker({ lesson, durationMin, tz, value, onPick }: SlotPickerProps) {
  const { color } = useTheme();
  const [now] = useState(() => new Date());
  const slots = useRescheduleSlots({
    teacherId: lesson.teacher.id,
    durationMin,
    studentIds: lesson.students.map((s) => s.id),
    now,
  });
  const days = slots.data ? freeSlotDays(slots.data.slots) : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const day = days.find((d) => d.date === chosen) ?? days[0];
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };

  if (slots.isError) {
    return <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />;
  }
  if (!slots.data) return <AppText style={note}>{t.common.loading}</AppText>;
  if (!day) return <AppText style={note}>{t.reschedule.noSlots}</AppText>;
  return (
    <View style={{ gap: 10 }}>
      <FormLabel>{t.reschedule.pickDay}</FormLabel>
      <FilterPills
        items={days.map((d) => ({ value: d.date, label: d.label }))}
        value={day.date}
        onChange={setChosen}
        accessibilityLabel={t.reschedule.pickDay}
        role="radiogroup"
      />
      <FormLabel>{t.booking.freeSlots}</FormLabel>
      <AppText style={note}>{slotLegend(tz)}</AppText>
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
            selected={slot.starts_at === value}
            onPick={onPick}
          />
        ))}
      </View>
      <AppText accessibilityLiveRegion="polite" style={note}>
        {value ? t.booking.picked.replace('{when}', whenText(value, tz)) : t.lessons.newTimeHint}
      </AppText>
    </View>
  );
}
