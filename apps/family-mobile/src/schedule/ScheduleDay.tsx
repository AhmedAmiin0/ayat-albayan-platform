import { dayWord, type WeekDay } from '@ab/client-core';
import { dateText, type ClockOptions } from '@ab/time';
import { View } from 'react-native';
import { AppText, InsetGroup, InsetSeparator, t, type, useTheme } from '@ab/mobile-kit';
import { ScheduleRow } from './ScheduleRow';

interface ScheduleDayProps {
  day: WeekDay;
  clock: ClockOptions;
  now: Date;
}

export function ScheduleDay({ day, clock, now }: ScheduleDayProps) {
  const { color } = useTheme();
  const first = day.lessons[0];
  const at = new Date(first?.lesson.starts_at ?? now);
  const name = dateText(at, clock, { weekday: 'long', day: 'numeric' });
  const today = dayWord(at, now, clock.tz) === 'today';
  return (
    <View style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.sm,
          color: today ? color.lapis : color.ink2,
        }}
      >
        {today ? t.portal.app.schedule.today.replace('{day}', name) : name}
      </AppText>
      <InsetGroup>
        {day.lessons.map((entry, i) => (
          <View key={entry.lesson.id}>
            {i > 0 ? <InsetSeparator /> : null}
            <ScheduleRow entry={entry} clock={clock} now={now} />
          </View>
        ))}
      </InsetGroup>
    </View>
  );
}
