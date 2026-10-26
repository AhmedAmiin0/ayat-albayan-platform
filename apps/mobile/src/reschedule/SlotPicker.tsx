import type { LessonView, SlotView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { freeSlotDays, slotLegend, whenText } from '@/booking/shared/slots';
import { PeriodSwitcher } from '@/calendar/overview/PeriodSwitcher';
import { addDays, riyadhToday, weekLabel, weekStart } from '@/calendar/lib/week';
import { t } from '@/core/lib/i18n/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { type, useTheme } from '@/theme';
import { localDate } from '@/today/timeline';
import { AppText } from '@/core/ui/primitives/AppText';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { slotWindow, useRescheduleSlots } from './queries';
import { SlotButton } from './SlotButton';

export interface SlotPickerProps {
  lesson: LessonView;
  durationMin: number;
  /** The family's zone: the small clocks. */
  tz: string;
  /** starts_at of the picked slot. */
  value: string | null;
  onPick: (startsAt: string) => void;
  /** «الحلقة دي وكل اللي بعدها»: only days from the lesson's own day (the API refuses earlier). */
  fromLessonDay?: boolean;
  /** «عدّل الوقت»: 15-minute starts, the lesson itself not counted as busy (useRescheduleSlots). */
  edit?: { stepMin: number; excludeLessonId: string };
}

/**
 * «الميعاد الجديد» (R-SCH-07): opens on the lesson's week (never before this one, like the web's
 * `near`), ‹ › moves a week; a day with free starts, then one of its free starts, then «الميعاد
 * اللي اخترته: …». Only clash-free slots are offered (the teacher's lessons, time-off and
 * availability, and the students' other lessons); nothing is typed (rule 6).
 */
export function SlotPicker({
  lesson,
  durationMin,
  tz,
  value,
  onPick,
  fromLessonDay,
  edit,
}: SlotPickerProps) {
  const { color } = useTheme();
  const [now] = useState(() => new Date());
  const thisWeek = weekStart(riyadhToday(now));
  const [week, setWeek] = useState(() => {
    const own = weekStart(riyadhToday(new Date(lesson.starts_at)));
    return own > thisWeek ? own : thisWeek;
  });
  const slots = useRescheduleSlots({
    teacherId: lesson.teacher.id,
    durationMin,
    studentIds: lesson.students.map((s) => s.id),
    ...slotWindow(week, now),
    ...edit,
  });
  const notBefore = fromLessonDay ? localDate(new Date(lesson.starts_at), tz) : '';
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink2,
  };
  return (
    <View style={{ gap: 10 }}>
      <PeriodSwitcher
        label={weekLabel(week)}
        current={week === thisWeek}
        canPrev={week > thisWeek}
        prevLabel={t.schedule.prevWeek}
        nextLabel={t.schedule.nextWeek}
        onPrev={() => setWeek(addDays(week, -7))}
        onNext={() => setWeek(addDays(week, 7))}
        onToday={() => setWeek(thisWeek)}
      />
      {slots.isError ? (
        <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />
      ) : slots.data ? (
        <WeekSlots
          slots={slots.data.slots.filter((s) => localDate(new Date(s.starts_at), tz) >= notBefore)}
          tz={tz}
          value={value}
          onPick={onPick}
        />
      ) : (
        <AppText style={note}>{t.common.loading}</AppText>
      )}
      <AppText accessibilityLiveRegion="polite" style={note}>
        {value ? t.booking.picked.replace('{when}', whenText(value, tz)) : t.lessons.newTimeHint}
      </AppText>
    </View>
  );
}

type WeekSlotsProps = Pick<SlotPickerProps, 'tz' | 'value' | 'onPick'> & { slots: SlotView[] };

/** The week's days with free starts (pills), then the chosen day's free starts. */
function WeekSlots({ slots, tz, value, onPick }: WeekSlotsProps) {
  const { color } = useTheme();
  const days = freeSlotDays(slots);
  const [chosen, setChosen] = useState<string | null>(null);
  const day = days.find((d) => d.date === chosen) ?? days[0];
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
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
    </>
  );
}
