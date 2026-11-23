import { nextLesson } from '@ab/client-core';
import type { ClockOptions, PortalLesson, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { teacherText, whenText } from '#/lessons/index.ts';
import { useChildLessons } from '#/portal/index.ts';

const panel = { gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 } as const;

interface NextPanelProps {
  lesson: PortalLesson;
  clock: ClockOptions;
  now: Date;
}

/** On the lapis wash, as the staff hero: the lead, when (the student's clock), the teacher. */
function NextPanel({ lesson, clock, now }: NextPanelProps) {
  const { color } = useTheme();
  const teacher = t.portal.app.lesson.teacher.replace('{name}', teacherText(lesson.teacher));
  return (
    <View style={{ ...panel, backgroundColor: color.lapisWash }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size['2xs'], color: color.lapis }}>
        {t.portal.nextLesson}
      </AppText>
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.base,
          color: color.coverInk,
          fontVariant: ['tabular-nums'],
        }}
      >
        {whenText(new Date(lesson.starts_at), clock, now)}
      </AppText>
      <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{teacher}</AppText>
    </View>
  );
}

interface ChildNextLineProps {
  student: PortalStudent;
  /** The student's clock: the viewer's cycle and language on the student's zone. */
  clock: ClockOptions;
}

/**
 * A child card's next lesson, or a calm «no lessons» note once the lessons are known (nothing
 * while they load, so the note never flashes before the lesson).
 */
export function ChildNextLine({ student, clock }: ChildNextLineProps) {
  const { color } = useTheme();
  const now = useNow();
  const lessons = useChildLessons(student.id).data;
  if (!lessons) return null;
  const next = nextLesson(lessons.lessons, now);
  return next ? (
    <NextPanel lesson={next} clock={clock} now={now} />
  ) : (
    <View style={{ ...panel, backgroundColor: color.sunk }}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
        {t.portal.lessonsEmpty}
      </AppText>
    </View>
  );
}
