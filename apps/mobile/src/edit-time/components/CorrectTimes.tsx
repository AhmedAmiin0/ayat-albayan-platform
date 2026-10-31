import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { dayLabel } from '@/calendar/lib/week';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { SlotButton } from '@/teaching/reschedule/SlotButton';
import { type, useTheme } from '@/theme';
import { localDate } from '@/today/lib/timeline';
import { AppText } from '@/core/ui/primitives/AppText';
import { correctStarts } from '../lib/edit-time-body';

interface CorrectTimesProps {
  lesson: LessonView;
  durationMin: number;
  /** The family's zone: the small clock under each start. */
  tz: string;
  now: Date;
  /** starts_at of the picked start; null = the recorded one. */
  value: string | null;
  onPick: (startsAt: string) => void;
}

/**
 * «تصحيح»: the day is fixed (the correction stays on it) and so is «before now»; what is picked is
 * the start, from quarter-hour times that keep the lesson on its own day and over by now. Nothing
 * is typed (rule 6). The recorded start shows picked until another one is.
 */
export function CorrectTimes({ lesson, durationMin, tz, now, value, onPick }: CorrectTimesProps) {
  const viewerZone = useViewerTz();
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  const starts = correctStarts(lesson, durationMin, now);
  const current = value ?? lesson.starts_at;
  const day = dayLabel(localDate(new Date(lesson.starts_at), tz));
  return (
    <View style={{ gap: 8 }}>
      <FormLabel>{t.editTime.correctTimes}</FormLabel>
      <AppText style={note}>{t.editTime.dayFixed.replace('{day}', day)}</AppText>
      <AppText style={note}>{zoneNote(viewerZone)}</AppText>
      {starts.length === 0 ? (
        <AppText style={note}>{t.editTime.noTimes}</AppText>
      ) : (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t.editTime.correctTimes}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        >
          {starts.map((startsAt) => (
            <SlotButton
              key={startsAt}
              startsAt={startsAt}
              tz={tz}
              selected={Date.parse(startsAt) === Date.parse(current)}
              onPick={onPick}
            />
          ))}
        </View>
      )}
    </View>
  );
}
