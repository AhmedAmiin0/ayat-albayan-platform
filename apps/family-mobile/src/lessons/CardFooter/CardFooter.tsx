import { AppText } from '@ab/mobile-kit';
import { optionsTitle } from '@/lessons/lesson-text';
import { LessonOptions } from '@/lessons/options/LessonOptions';
import type { CardFooterProps } from './CardFooter.types';
import { noteOf } from './card-footer.helpers';
import { useCardFooter } from './use-card-footer';

/** The full card's end: where our room opens, and the lesson options. */
export function CardFooter({ lesson, student, clock, now, live, onNotice }: CardFooterProps) {
  const { inApp, note } = useCardFooter();
  return (
    <>
      {lesson.way_in === 'classroom' ? <AppText style={note}>{noteOf(live, inApp)}</AppText> : null}
      <LessonOptions
        lesson={lesson}
        student={student}
        now={now}
        title={optionsTitle(lesson, clock, now)}
        onNotice={onNotice}
      />
    </>
  );
}
