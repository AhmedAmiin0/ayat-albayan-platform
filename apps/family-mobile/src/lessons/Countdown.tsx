import { lessonClock, lessonClockText } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';

interface CountdownProps {
  lesson: PortalLesson;
  /** The screen's clock, ticking every second. */
  now: Date;
  /** The child's page: the timer is the card's main figure (canvas Child). */
  big?: boolean;
}

/** A timer, never read out every second. */
export function Countdown({ lesson, now, big = false }: CountdownProps) {
  const { color } = useTheme();
  const clock = lessonClock(lesson, now);
  if (!clock) return null;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: color.lapisHover,
      }}
    >
      <AppText
        accessibilityRole="timer"
        style={{
          fontFamily: type.ui[600],
          fontSize: big ? type.size.h4 : type.size.xs,
          color: color.onLapis,
          fontVariant: ['tabular-nums'],
        }}
      >
        {lessonClockText(clock, t.portal)}
      </AppText>
    </View>
  );
}
