import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { optionsTitle, whenText } from '@/lessons/lesson-text';
import { LessonOptions } from '@/lessons/options/LessonOptions';

interface OptionsRowProps {
  lesson: PortalLesson;
  student: PortalStudent;
  /** The student's clock. */
  clock: ClockOptions;
  now: Date;
  /** The row's words (time, teacher, what the family asked). */
  children: ReactNode;
}

/** A lesson without options is plain text; otherwise its words open the lesson options. */
export function OptionsRow({ lesson, student, clock, now, children }: OptionsRowProps) {
  const { color } = useTheme();
  const [notice, setNotice] = useState<string | null>(null);
  const when = whenText(new Date(lesson.starts_at), clock, now);
  const said = notice ? (
    <AppText accessibilityLiveRegion="polite" style={{ fontSize: type.size.xs, color: color.ok }}>
      {notice}
    </AppText>
  ) : null;
  return (
    <LessonOptions
      lesson={lesson}
      student={student}
      now={now}
      title={optionsTitle(lesson, clock, now)}
      onNotice={setNotice}
    >
      {(open) =>
        open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.portal.actions.optionsFor.replace('{when}', when)}
            onPress={open}
            style={({ pressed }) => ({ flex: 1, gap: 2, opacity: pressed ? 0.7 : 1 })}
          >
            {children}
            {said}
          </Pressable>
        ) : (
          <View style={{ flex: 1, gap: 2 }}>
            {children}
            {said}
          </View>
        )
      }
    </LessonOptions>
  );
}
