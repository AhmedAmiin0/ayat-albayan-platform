import type { SlotView } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { AppText } from '@/ui/AppText';
import { ErrorState } from '@/ui/ErrorState';
import { shape, type, useTheme } from '@/theme';
import { useSlots } from './queries';
import { freeSlotDays, slotLegend, slotTimes, slotWindow } from './slots';

export interface SlotStepProps {
  teacherId: string;
  /** The family's zone: the small clock under each Riyadh time. */
  tz: string;
  /** The lesson length the slot must fit (the draft's «المده»). */
  durationMin: number;
  onPick: (startsAt: string) => void;
}

/**
 * The slot step (R-SCH-06): the teacher's free starts over the next 7 days, by Riyadh day. Each is
 * a button with the Riyadh time and the student's own; nothing is typed (rule 6). Mounting again
 * (after a clash) asks the API afresh from now.
 */
export function SlotStep({ teacherId, tz, durationMin, onPick }: SlotStepProps) {
  const { color } = useTheme();
  const [now] = useState(() => new Date());
  const slots = useSlots({ teacherId, ...slotWindow(now), durationMin });
  const days = slots.data ? freeSlotDays(slots.data.slots) : [];
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };

  return (
    <View style={{ gap: 12 }}>
      <FormLabel>{`${t.booking.pickTime} *`}</FormLabel>
      <AppText style={note}>{slotLegend(tz)}</AppText>
      {slots.isError ? (
        <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />
      ) : null}
      {slots.isPending ? <AppText style={note}>{t.common.loading}</AppText> : null}
      {slots.data && days.length === 0 ? (
        <AppText style={note}>{t.booking.mobile.noSlots}</AppText>
      ) : null}
      {days.length > 0 ? <FormLabel>{t.booking.startsOn}</FormLabel> : null}
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
              <SlotButton key={slot.starts_at} slot={slot} tz={tz} onPick={onPick} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function SlotButton({
  slot,
  tz,
  onPick,
}: {
  slot: SlotView;
  tz: string;
  onPick: (startsAt: string) => void;
}) {
  const { color } = useTheme();
  const { riyadh, local } = slotTimes(slot.starts_at, tz);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={local ? `${riyadh}${t.common.listJoiner}${local}` : riyadh}
      onPress={() => onPick(slot.starts_at)}
      style={({ pressed }) => ({
        minHeight: shape.control.touch,
        minWidth: 88,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: pressed ? color.sunk : color.raised,
      })}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {riyadh}
      </AppText>
      {local ? (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size['2xs'],
            color: color.ink2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {local}
        </AppText>
      ) : null}
    </Pressable>
  );
}
