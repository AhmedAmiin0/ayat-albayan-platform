import { counted } from '@ab/core';
import { togglePick } from '@ab/schedule';
import { useState } from 'react';
import { View } from 'react-native';
import { useViewerClock, zoneNote } from '@/core/lib/clock';
import {
  t,
  AppText,
  ErrorState,
  SlotButton,
  type,
  useTheme,
  FormLabel,
  freeSlotDays,
} from '@ab/mobile-kit';
import { MultiFooter } from './MultiFooter';
import { OtherTime } from '@/booking/other-time';
import { useSlots } from '@/booking/shared/queries';
import { slotWindow, windowStart } from '@/booking/shared/slots';

/** A weekly package: one slot per weekday of the family's zone, each with its own time. */
export interface SlotMulti {
  picks: readonly string[];
  onChange: (picks: string[]) => void;
  onNext: () => void;
  /** Days a week the course needs; next waits for exactly that many. */
  need?: number;
}

export interface SlotStepProps {
  teacherId: string;
  /** The family's zone: the small clock under each viewer's time, and the picks' weekdays. */
  tz: string;
  /** The lesson length the slot must fit. */
  durationMin: number;
  /** One slot (a trial, a makeup): picking it moves on. */
  onPick?: (startsAt: string) => void;
  /** One slot only: a start of the server's fortnight, outside the hours or not. */
  onPickOther?: (startsAt: string, outside: boolean) => void;
  /** Several slots for a package: toggled, then next. */
  multi?: SlotMulti;
  /** The earliest start (an instant), when later than now: a subscription that starts ahead. */
  from?: string;
  /** This course's own lessons of these students are not busy because they move. */
  exclude?: { course: string; studentIds: readonly string[] };
  /** The upcoming trial it moves; its own time is not busy. */
  excludeLessonId?: string;
}

/**
 * The slot step (R-SCH-06): the teacher's free starts over the next 7 days, by the viewer's day.
 * Each is a button with the viewer's time and the student's own; nothing is typed (rule 6). A
 * package picks one start per weekday (togglePick: the same one again removes it, another on that
 * day replaces it). Mounting again (after a clash) asks the API afresh from now (or `from`, when
 * later).
 */
export function SlotStep(props: SlotStepProps) {
  const { teacherId, tz, durationMin, onPick, multi, from, exclude, excludeLessonId } = props;
  const { onPickOther } = props;
  const other = { teacherId, tz, durationMin, ...excludeParams(exclude, excludeLessonId) };
  const { color } = useTheme();
  const viewer = useViewerClock();
  const viewerZone = viewer.tz;
  const [now] = useState(() => new Date());
  const slots = useSlots({ teacherId, ...slotWindow(windowStart(now, from)), durationMin, ...excludeParams(exclude, excludeLessonId) });
  const days = slots.data ? freeSlotDays(slots.data.slots, viewerZone) : [];
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  const picks = multi?.picks ?? [];
  const tap = (slot: string) =>
    multi ? multi.onChange(togglePick({ picks: multi.picks, slot, tz })) : onPick?.(slot);

  return (
    <View style={{ gap: 12 }}>
      <FormLabel required>{multi ? t.booking.pickDayTimes : t.booking.pickTime}</FormLabel>
      {multi?.need ? <AppText style={{ ...note, color: color.ink }}>{counted(t.booking.pickNDays, multi.need)}</AppText> : null}
      <AppText style={note}>{zoneNote(viewerZone)}</AppText>
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
                viewer={viewer}
                role={multi ? 'checkbox' : 'button'}
                selected={picks.includes(slot.starts_at)}
                onPick={tap}
              />
            ))}
          </View>
        </View>
      ))}
      {multi ? <MultiFooter multi={multi} tz={tz} /> : null}
      {onPickOther && !multi ? <OtherTime {...other} onPick={onPickOther} /> : null}
    </View>
  );
}

type ExcludeParams = { studentIds?: string; excludeCourse?: string; excludeLessonId?: string };

/** GET /booking/slots `studentIds` + `excludeCourse` when a course's own lessons move; `excludeLessonId` a trial. */
export function excludeParams(exclude: SlotStepProps['exclude'], excludeLessonId?: string): ExcludeParams {
  const lesson = excludeLessonId ? { excludeLessonId } : {};
  return exclude ? { studentIds: exclude.studentIds.join(','), excludeCourse: exclude.course, ...lesson } : lesson;
}

/** Loading, a failed read (retry) or no free start at all. */
function SlotsStatus({ slots, empty }: { slots: ReturnType<typeof useSlots>; empty: boolean }) {
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  if (slots.isError) return <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />;
  if (slots.isPending) return <AppText style={note}>{t.common.loading}</AppText>;
  return empty ? <AppText style={note}>{t.booking.mobile.noSlots}</AppText> : null;
}
