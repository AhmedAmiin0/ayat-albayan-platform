import { nextLesson } from '@ab/client-core';
import type { PortalLessons, PortalStudent } from '@ab/shared';
import { AppText, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { NextLessonCard, PrepareCard } from '@/lessons';

interface CardLessonsProps {
  lessons: PortalLessons;
  student: PortalStudent;
}

/** The home card's lesson part: the next lesson (countdown, join) or «no lessons», «ما المطلوب». */
export function CardLessons({ lessons, student }: CardLessonsProps) {
  const { color } = useTheme();
  const next = nextLesson(lessons.lessons, useNow());
  return (
    <>
      {next ? (
        <NextLessonCard lesson={next} student={student} />
      ) : (
        <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
          {t.portal.lessonsEmpty}
        </AppText>
      )}
      <PrepareCard lessons={lessons} student={student} />
    </>
  );
}
