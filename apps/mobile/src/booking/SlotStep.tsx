import { counted, togglePick } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { SlotButton } from '@/reschedule/SlotButton';
import { AppText } from '@/ui/AppText';
import { ErrorState } from '@/ui/ErrorState';
import { type, useTheme } from '@/theme';
import { MultiFooter } from './MultiFooter';
import { useSlots } from './queries';
import { freeSlotDays, slotLegend, slotWindow, windowStart } from './slots';

/** A weekly package: one slot per weekday of the family's zone, each with its own time. */
export interface SlotMulti {
  picks: readonly string[];
  onChange: (picks: string[]) => void;
  /** «التالي»: on to the next step once the days are picked. */
  onNext: () => void;
  /** Days a week the course needs (the assistant's course): «التالي» waits for exactly that many. */
  need?: number;
}

export interface SlotStepProps {
  teacherId: string;
  /** The family's zone: the small clock under each Riyadh time, and the picks' weekdays. */
  tz: string;
  /** The lesson length the slot must fit (the draft's «المده»). */
  durationMin: number;
  /** One slot (a trial, a makeup): picking it moves on. */
  onPick?: (startsAt: string) => void;
  /** Several slots (a package): toggled, then «التالي». */
  multi?: SlotMulti;
  /** The earliest start (an instant), when later than now: a subscription that starts ahead. */
  from?: string;
  /** «تغيير أيام الحلقات»: this course's own lessons (of these students) are not busy: they move. */
  exclude?: { course: string; studentIds: readonly string[] };
}

/**
 * The slot step (R-SCH-06): the teacher's free starts over the next 7 days, by Riyadh day. Each is
 * a button with the Riyadh time and the student's own; nothing is typed (rule 6). A package picks
 * one start per weekday (togglePick: the same one again removes it, another on that day replaces
 * it). Mounting again (after a clash) asks the API afresh from now (or `from`, when later).
 */
export function SlotStep({ teacherId, tz, durationMin, onPick, multi, from, exclude }: SlotStepProps) {
  const { color } = useTheme();
  const [now] = useState(() => new Date());
  const slots = useSlots({ teacherId, ...slotWindow(windowStart(now, from)), durationMin, ...excludeParams(exclude) });
  const days = slots.data ? freeSlotDays(slots.data.slots) : [];
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  const picks = multi?.picks ?? [];
  const tap = (slot: string) =>
    multi ? multi.onChange(togglePick({ picks: multi.picks, slot, tz })) : onPick?.(slot);

  return (
    <View style={{ gap: 12 }}>
      <FormLabel required>{multi ? t.booking.pickDayTimes : t.booking.pickTime}</FormLabel>
      {multi?.need ? <AppText style={{ ...note, color: color.ink }}>{counted(t.booking.pickNDays, multi.need)}</AppText> : null}
      <AppText style={note}>{slotLegend(tz)}</AppText>
      <SlotsStatus slots={slots} empty={days.length === 0} />
      {days.length > 0 && !multi ? <FormLabel>{t.booking.startsOn}</FormLabel> : null}
      {days.map((day) => (
        <View key={day.date} style={{ gap: 8 }}>
          <AppText
            accessibilityRole="header"
            style={{ ...note, fontFamily: type.ui[600], color: color.ink }}
          >
            {day.label}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {day.slots.map((slot) => (
              <SlotButton
                key={slot.starts_at}
                startsAt={slot.starts_at}
                tz={tz}
                role={multi ? 'checkbox' : 'button'}
                selected={picks.includes(slot.starts_at)}
                onPick={tap}
              />
            ))}
          </View>
        </View>
      ))}
      {multi ? <MultiFooter multi={multi} tz={tz} /> : null}
    </View>
  );
}

/** GET /booking/slots `studentIds` + `excludeCourse`, when a course's own lessons move. */
function excludeParams(exclude: SlotStepProps['exclude']): { studentIds?: string; excludeCourse?: string } {
  return exclude ? { studentIds: exclude.studentIds.join(','), excludeCourse: exclude.course } : {};
}

/** Loading, a failed read (retry) or no free start at all. */
function SlotsStatus({ slots, empty }: { slots: ReturnType<typeof useSlots>; empty: boolean }) {
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  if (slots.isError) return <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />;
  if (slots.isPending) return <AppText style={note}>{t.common.loading}</AppText>;
  return empty ? <AppText style={note}>{t.booking.mobile.noSlots}</AppText> : null;
}
