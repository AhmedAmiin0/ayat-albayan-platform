import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { dayLabel } from '@/calendar';
import { useViewerClock, zoneNote } from '@/core/lib/clock';
import { t, type, useTheme, AppText, SlotButton, FormLabel } from '@ab/mobile-kit';
import { localDate } from '@/today';
import { correctStarts } from '@/edit-time/lib/edit-time-body';

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

/** A correction keeps its day and stays in the past: only quarter-hour starts on that day. */
export function CorrectTimes({ lesson, durationMin, tz, now, value, onPick }: CorrectTimesProps) {
  const viewer = useViewerClock();
  const viewerZone = viewer.tz;
  const { color } = useTheme();
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink2,
  };
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
              viewer={viewer}
              selected={Date.parse(startsAt) === Date.parse(current)}
              onPick={onPick}
            />
          ))}
        </View>
      )}
    </View>
  );
}
