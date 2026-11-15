import { lessonClock, lessonClockText } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';

interface CountdownProps {
  lesson: PortalLesson;
  /** The screen's clock, ticking every second. */
  now: Date;
}

/**
 * The live countdown (docs/50 §6) on the next-lesson card: to the window, then to the start;
 * «الحلقة جارية الآن» while it runs. A timer, never read out every second.
 */
export function Countdown({ lesson, now }: CountdownProps) {
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
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
      }}
    >
      <AppText
        accessibilityRole="timer"
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.xs,
          color: color.onLapis,
          fontVariant: ['tabular-nums'],
        }}
      >
        {lessonClockText(clock, t.portal)}
      </AppText>
    </View>
  );
}
