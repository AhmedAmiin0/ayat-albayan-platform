import type { CourseCardView } from '@ab/shared';
import { CardLessons } from './CardLessons';
import { CardSummary } from './CardSummary';

interface CardBodyProps {
  card: CourseCardView | undefined;
  /** After a write from a lesson's drawer: what it did. */
  onDone: (message: string) => void;
}

/** The card's lines, then «الحلقات القادمة» once a course is booked; nothing while loading. */
export function CardBody({ card, onDone }: CardBodyProps) {
  if (!card) return null;
  return (
    <>
      <CardSummary card={card} />
      {card.course && <CardLessons lessons={card.upcoming} onDone={onDone} />}
    </>
  );
}
