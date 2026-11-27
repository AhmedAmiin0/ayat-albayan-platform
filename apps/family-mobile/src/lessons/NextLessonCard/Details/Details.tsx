import { lessonMinutes } from '@ab/client-core';
import { firstName } from '@ab/schedule';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { rangeText, teacherText } from '@/lessons/lesson-text';
import { RequestLine } from '@/lessons/options/RequestLine';
import type { DetailsProps } from './Details.types';

/** The full card's lines: the time range and length, the teacher, what the family did. */
export function Details({ lesson, student, clock, now }: DetailsProps) {
  const { color } = useTheme();
  const A = t.portal.app.lesson;
  const minutes = A.minutes.replace('{n}', String(lessonMinutes(lesson)));
  const words = { color: color.onLapis, fontSize: type.size.xs };
  return (
    <>
      <AppText style={{ ...words, fontFamily: type.ui[600], fontSize: type.size.base }}>
        {`${rangeText(lesson, clock)} · ${minutes}`}
      </AppText>
      <AppText style={words}>{A.teacher.replace('{name}', teacherText(lesson.teacher))}</AppText>
      <RequestLine
        lesson={lesson}
        clock={clock}
        ink={color.onLapis}
        now={now}
        student={firstName(student.name)}
      />
    </>
  );
}
