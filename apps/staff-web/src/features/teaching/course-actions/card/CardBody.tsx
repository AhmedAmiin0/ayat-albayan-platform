import type { CourseCardView } from '@ab/shared';
import { CardLessons } from './CardLessons';
import { CardSummary } from './CardSummary';

/** The course lines, then «الحلقات القادمة» once a course is booked; nothing while loading. */
export function CardBody({ card }: { card: CourseCardView | undefined }) {
  if (!card) return null;
  return (
    <>
      <CardSummary card={card} />
      {card.course && <CardLessons lessons={card.upcoming} />}
    </>
  );
}
